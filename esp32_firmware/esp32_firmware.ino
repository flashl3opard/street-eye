#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------
// Configuration
// ---------------------------------------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Unique ID for this ESP32 module
const String UNIQUE_ID = "ESP32_STREET_01";

// Pin definitions (example based on common ESP32 dev boards)
const int ACS712_PIN = 34;    // Analog pin for current sensor
const int LDR_PIN = 35;       // Analog pin for Light Dependent Resistor
const int PIR_PIN = 14;       // Digital pin for PIR motion sensor
// DS18B20 temp sensor usually requires OneWire and DallasTemperature libraries
// For simplicity in this base sketch, we'll send a dummy/simulated temperature
// but you can add the DallasTemperature logic here.

// Server instance on port 80
WebServer server(80);

unsigned long startTime;

void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize sensors
  pinMode(ACS712_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);

  startTime = millis();

  // Connect to Wi-Fi
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP()); // This is the IP you put in DATA_URL!

  // Setup HTTP routes
  server.on("/data", HTTP_GET, handleDataRequest);
  
  // Start server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
  delay(10); // Small yield
}

void handleDataRequest() {
  // Read sensors
  // Note: These analogRead functions might need calibration for accurate amps/percentages
  int rawCurrent = analogRead(ACS712_PIN);
  int rawLdr = analogRead(LDR_PIN);
  bool pirState = digitalRead(PIR_PIN);
  
  // Convert raw readings to expected formats
  // Fake conversion logic - replace with actual sensor formulas
  float currentAmps = (rawCurrent / 4095.0) * 5.0; // Example math
  int ldrPercentage = map(rawLdr, 0, 4095, 0, 100);
  float tempCelsius = 28.5; // Dummy static temperature for now
  
  unsigned long uptimeSeconds = (millis() - startTime) / 1000;

  // Create JSON document
  // Sized appropriately for 1 lamp + unique_id
  StaticJsonDocument<512> doc;
  
  doc["unique_id"] = UNIQUE_ID;
  doc["uptime"] = uptimeSeconds;
  
  JsonArray lamps = doc.createNestedArray("lamps");
  
  JsonObject lamp1 = lamps.createNestedObject();
  lamp1["id"] = 1; // Lamp ID must match one of the LAMP_DEFINITIONS if you want static GPS/labels
  lamp1["current"] = currentAmps;
  lamp1["ldr"] = ldrPercentage;
  lamp1["pir"] = pirState;
  lamp1["temp"] = tempCelsius;

  // Serialize JSON to string
  String jsonResponse;
  serializeJson(doc, jsonResponse);

  // Send response
  // Added CORS header so Next.js frontend can fetch it directly
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", jsonResponse);
}
