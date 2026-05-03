#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ---------------------------------------------------------
// WiFi + Backend Config
// ---------------------------------------------------------
const char *WIFI_SSID = "CC 1st Floor";
const char *WIFI_PASSWORD = "12345678";

const char *BACKEND_URL = "http://10.82.225.43:3000/api/hardware";

const char *DEVICE_NUMBER = "1001";
const char *UNIQUE_ID = "ESP32_STREET_1001";

const int LAMP_ID = 1;

// ---------------------------------------------------------
// Pins
// ---------------------------------------------------------
#define PIR_PIN 2
#define CURRENT_PIN 34
#define LDR_PIN 33
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define LED_PIN 2

// ---------------------------------------------------------
// ADC + ACS712 Config
// ---------------------------------------------------------
#define ADC_RESOLUTION 4095.0
#define VREF 3.3
#define SENSITIVITY_MV_PER_A 43.56
#define NUM_SAMPLES 100

// ---------------------------------------------------------
// GPS Config
// ---------------------------------------------------------
#define GPS_BAUDRATE 9600

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ---------------------------------------------------------
unsigned long bootMillis;
unsigned long lastPostMillis = 0;
const unsigned long POST_INTERVAL_MS = 3000;

// ---------------------------------------------------------
void setup()
{
    Serial.begin(115200);
    delay(500);

    pinMode(PIR_PIN, INPUT);
    pinMode(LDR_PIN, INPUT_PULLDOWN);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    analogReadResolution(12);

    gpsSerial.begin(GPS_BAUDRATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

    bootMillis = millis();

    connectToWiFi();

    Serial.println("System Ready...");
}

// ---------------------------------------------------------
void loop()
{
    updateGPS();

    if (WiFi.status() != WL_CONNECTED)
    {
        connectToWiFi();
    }

    float current = readCurrentAC();
    int ldr = readLdrPercent();

    if (current > 0 || ldr > 0)
    {
        digitalWrite(LED_PIN, HIGH);
    }
    else
    {
        digitalWrite(LED_PIN, LOW);
    }

    if (millis() - lastPostMillis >= POST_INTERVAL_MS)
    {
        lastPostMillis = millis();
        postReading();
    }

    delay(10);
}

// ---------------------------------------------------------
void connectToWiFi()
{
    Serial.print("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nConnected!");
    Serial.println(WiFi.localIP());
}

// ---------------------------------------------------------
// SENSOR FUNCTIONS
// ---------------------------------------------------------
bool readPIR()
{
    return digitalRead(PIR_PIN) == HIGH;
}

float readCurrentAC()
{
    float maxVoltage = 0;
    float minVoltage = 5;

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        int raw = analogRead(CURRENT_PIN);
        float voltage = (raw / ADC_RESOLUTION) * VREF;

        if (voltage > maxVoltage)
            maxVoltage = voltage;
        if (voltage < minVoltage)
            minVoltage = voltage;

        delayMicroseconds(100);
    }

    float acVoltage = (maxVoltage - minVoltage) / 2.0;
    float current = acVoltage / (SENSITIVITY_MV_PER_A / 1000.0);

    if (current < 0.05)
        current = 0;

    return current;
}

int readLdrPercent()
{
    long sum = 0;
    for (int i = 0; i < 10; i++)
    {
        sum += analogRead(LDR_PIN);
        delayMicroseconds(200);
    }
    int raw = sum / 10;

    if (raw < 50)
        return 0;

    int percent = map(raw, 0, 4095, 0, 100);
    return constrain(percent, 0, 100);
}

void updateGPS()
{
    while (gpsSerial.available())
    {
        gps.encode(gpsSerial.read());
    }
}

// ---------------------------------------------------------
// MAIN POST FUNCTION
// ---------------------------------------------------------
void postReading()
{
    float current = readCurrentAC();
    int ldr = readLdrPercent();
    bool motion = readPIR();
    unsigned long uptime = (millis() - bootMillis) / 1000;

    float lat = 0, lng = 0;
    bool gpsValid = false;

    if (gps.location.isValid())
    {
        lat = gps.location.lat();
        lng = gps.location.lng();
        gpsValid = true;
    }

    // JSON BUILD
    StaticJsonDocument<512> doc;

    doc["unique_id"] = UNIQUE_ID;
    doc["device_number"] = DEVICE_NUMBER;
    doc["uptime"] = uptime;

    JsonArray lamps = doc.createNestedArray("lamps");
    JsonObject lamp = lamps.createNestedObject();

    lamp["id"] = LAMP_ID;
    lamp["current"] = current;
    lamp["ldr"] = ldr;
    lamp["pir"] = motion;
    lamp["temp"] = 28.5;

    // GPS block
    JsonObject gpsObj = doc.createNestedObject("gps");
    gpsObj["valid"] = gpsValid;
    gpsObj["lat"] = lat;
    gpsObj["lng"] = lng;
    gpsObj["sat"] = gps.satellites.value();

    String payload;
    serializeJson(doc, payload);

    Serial.println("\nSending Data:");
    Serial.println(payload);

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    int statusCode = http.POST(payload);
    String response = http.getString();

    Serial.print("Status: ");
    Serial.println(statusCode);

    Serial.print("Response: ");
    Serial.println(response);

    http.end();
}