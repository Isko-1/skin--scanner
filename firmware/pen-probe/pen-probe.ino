// firmware/pen-probe/pen-probe.ino
//
// Ties together everything else in this folder tree that talks about the
// probe: on button press, aims the 650nm laser line, reads the AS7341's 10
// channels, and POSTs them to /api/spectral (see that route + lib/spectral.ts
// + lib/spectral-patterns.ts on the website side for what happens to the
// data after this).
//
// Board: ESP32 DevKit clone. Libraries needed (Arduino IDE Library Manager):
//   - WiFiManager by tzapu       (captive portal WiFi setup — see below)
//   - Adafruit AS7341            (spectral sensor)
//   - ArduinoJson                (building the POST body)
//
// KNOWN MVP LIMITATION (see README "Спектральный щуп"): the probe has no
// screen or keyboard, so PEN_MOLE_ID below is a hardcoded constant — to scan
// a different mole, copy its uuid from the mole's page URL and reflash. Fine
// for one person testing one probe; a real multi-user product needs a
// pairing flow instead of a recompile.

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AS7341.h>

// ---------------------------------------------------------------------------
// Config — wiring and endpoint. Pins are a starting point, not gospel: match
// them to however you actually wired the button/laser on the "pen" body.
// ---------------------------------------------------------------------------
constexpr int PIN_BUTTON = 4;   // to GND, uses internal pull-up — no external resistor needed
constexpr int PIN_LASER = 5;    // 650nm laser line module, through a transistor if it draws >~12mA
constexpr int PIN_STATUS_LED = 2; // onboard LED on most ESP32 DevKit clones

constexpr uint32_t LONG_PRESS_MS = 3000;  // hold this long to reset WiFi + reopen the setup portal
constexpr uint32_t COOLDOWN_MS = 3000;    // minimum gap between readings — see loop() for why
constexpr uint32_t LASER_WARMUP_MS = 150; // let the laser/sensor settle before integrating

// This mole_id must exist in your Supabase `moles` table already (create it
// from the website first, then copy the uuid out of the URL).
constexpr char PEN_MOLE_ID[] = "REPLACE_WITH_REAL_MOLE_UUID";

constexpr char SERVER_HOST[] = "your-site.vercel.app"; // no https://, no trailing slash
constexpr char SPECTRAL_PATH[] = "/api/spectral";

// Must match SPECTRAL_DEVICE_SECRET in .env.local on the website exactly —
// see the comment there for how it's generated. Placeholder here on purpose;
// the sketch intentionally won't do anything convincing until you replace it.
constexpr char DEVICE_SECRET[] = "REPLACE_WITH_REAL_SECRET";

Adafruit_AS7341 as7341;
bool sensorReady = false;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LASER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_LASER, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);

  Wire.begin();
  sensorReady = as7341.begin();
  if (!sensorReady) {
    // Not fatal — WiFi/button still work, so you can debug wiring over
    // Serial without the whole sketch refusing to boot. blinkError() below
    // makes this visible even without a laptop plugged in.
    Serial.println("AS7341 not found — check I2C wiring (SDA/SCL) before anything else.");
  } else {
    // Middling gain/timing defaults — the AS7341 is a 16-bit ADC per
    // channel, these control how much light it takes to fill that range.
    // Recalibrate once real readings come in: if channels are pinned at
    // 65535 (saturated) lower the gain; if everything reads near 0, raise it.
    as7341.setATIME(100);
    as7341.setASTEP(999);
    as7341.setGain(AS7341_GAIN_256X);
  }

  connectWifi();
  Serial.println("Ready. Short press = take a reading. Hold 3s = reset WiFi.");
}

// ---------------------------------------------------------------------------
// WiFi provisioning — this is the "специальная сеть, на которую когда
// нажимаешь, выходит меню Wi-Fi-ев" from the original plan. WiFiManager
// opens a temporary access point named below; connect to it from a phone,
// pick your real network from the list it shows, enter the password, and it
// switches the ESP32 into normal client (STA) mode with internet access —
// same pattern smart-home devices use. It does NOT stay as its own AP
// afterward, which matters: an AP with no uplink could never reach your
// site, only a client-mode connection with real internet can.
// ---------------------------------------------------------------------------
void connectWifi() {
  WiFiManager wm;
  digitalWrite(PIN_STATUS_LED, HIGH); // solid on while waiting for setup, if needed
  bool connected = wm.autoConnect("SkinProbe-Setup");
  digitalWrite(PIN_STATUS_LED, LOW);

  if (!connected) {
    Serial.println("WiFi setup timed out — restarting to try again.");
    delay(1000);
    ESP.restart();
  }
  Serial.print("WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}

// ---------------------------------------------------------------------------
// Button state machine — press/release timing decides short vs. long press.
// Runs every loop() iteration without delay() so it stays responsive; the
// only blocking work happens inside takeReadingAndSend(), which is a
// deliberate user-triggered action, not something the loop needs to stay
// free during.
// ---------------------------------------------------------------------------
bool buttonWasDown = false;
uint32_t pressStartedAt = 0;
uint32_t lastReadingAt = 0; // 0 == never yet, so the very first press isn't blocked by cooldown

void loop() {
  bool buttonIsDown = digitalRead(PIN_BUTTON) == LOW; // pull-up wiring: LOW while held

  if (buttonIsDown && !buttonWasDown) {
    // Just pressed.
    pressStartedAt = millis();
  }

  if (!buttonIsDown && buttonWasDown) {
    // Just released — decide what the press meant.
    uint32_t heldFor = millis() - pressStartedAt;

    if (heldFor >= LONG_PRESS_MS) {
      resetWifiAndRestart();
    } else if (heldFor >= 30) {
      // 30ms floor filters out contact bounce / static noise as a "press".
      handleShortPress();
    }
  }

  buttonWasDown = buttonIsDown;
}

void handleShortPress() {
  uint32_t sinceLastReading = millis() - lastReadingAt;
  if (lastReadingAt != 0 && sinceLastReading < COOLDOWN_MS) {
    // Ignore — still cooling down. Two things this protects: the AS7341
    // needs the laser/lighting to actually settle between reads (a reading
    // taken mid-bounce is garbage in, garbage out), and it stops a
    // trigger-happy button from hammering /api/spectral with duplicate rows
    // for what was really one measurement.
    blinkStatus(2, 80); // quick double-blink = "not yet, still cooling down"
    return;
  }

  takeReadingAndSend();
  lastReadingAt = millis();
}

void resetWifiAndRestart() {
  Serial.println("Long press — clearing WiFi credentials and reopening setup portal.");
  blinkStatus(5, 150);
  WiFiManager wm;
  wm.resetSettings();
  delay(300);
  ESP.restart();
}

// ---------------------------------------------------------------------------
// The actual measurement + upload.
// ---------------------------------------------------------------------------
void takeReadingAndSend() {
  if (!sensorReady) {
    Serial.println("Reading requested but AS7341 never initialized — check wiring.");
    blinkStatus(3, 300); // slow triple-blink = hardware problem, distinct from cooldown's quick one
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reading requested but WiFi is down.");
    blinkStatus(3, 300);
    return;
  }

  digitalWrite(PIN_STATUS_LED, HIGH);
  digitalWrite(PIN_LASER, HIGH);
  delay(LASER_WARMUP_MS);

  uint16_t readings[12]; // AS7341 fills 12 slots; channels 4 and 9 (Clear/NIR duplicates) are unused
  bool ok = as7341.readAllChannels(readings);

  digitalWrite(PIN_LASER, LOW);

  if (!ok) {
    Serial.println("AS7341 read failed.");
    digitalWrite(PIN_STATUS_LED, LOW);
    blinkStatus(3, 300);
    return;
  }

  // Index layout per Adafruit_AS7341::readAllChannels(): F1,F2,F3,F4,Clear,
  // NIR,F5,F6,F7,F8,Clear,NIR — the library reads two ADC channels per
  // integration cycle, hence Clear/NIR appearing twice; the second pair
  // (indices 10, 11) matches the second cycle's F5-F8 readings. Field names
  // here match CHANNEL_KEYS in lib/spectral.ts exactly, on purpose — that's
  // the contract /api/spectral validates against.
  uint16_t f1 = readings[0], f2 = readings[1], f3 = readings[2], f4 = readings[3];
  uint16_t f5 = readings[6], f6 = readings[7], f7 = readings[8], f8 = readings[9];
  uint16_t clearVal = readings[10];
  uint16_t nirVal = readings[11];

  sendReading(f1, f2, f3, f4, f5, f6, f7, f8, clearVal, nirVal);
  digitalWrite(PIN_STATUS_LED, LOW);
}

void sendReading(uint16_t f1, uint16_t f2, uint16_t f3, uint16_t f4, uint16_t f5, uint16_t f6, uint16_t f7,
                  uint16_t f8, uint16_t clearVal, uint16_t nirVal) {
  WiFiClientSecure client;
  // MVP shortcut: skips TLS certificate validation. Fine for a jury demo on
  // a network you control; do NOT ship this as-is if the probe ever leaves
  // your hands — swap in client.setCACert(...) with the real cert chain.
  client.setInsecure();

  HTTPClient http;
  String url = String("https://") + SERVER_HOST + SPECTRAL_PATH;
  if (!http.begin(client, url)) {
    Serial.println("http.begin() failed — check SERVER_HOST.");
    blinkStatus(3, 300);
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_SECRET);

  JsonDocument doc; // ArduinoJson v7 — no template size argument needed
  doc["mole_id"] = PEN_MOLE_ID;
  JsonObject channels = doc["channels"].to<JsonObject>();
  channels["f1"] = f1;
  channels["f2"] = f2;
  channels["f3"] = f3;
  channels["f4"] = f4;
  channels["f5"] = f5;
  channels["f6"] = f6;
  channels["f7"] = f7;
  channels["f8"] = f8;
  channels["clear"] = clearVal;
  channels["nir"] = nirVal;

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);
  if (status == 200) {
    Serial.println("Reading sent OK.");
    blinkStatus(1, 400); // single long blink = success
  } else {
    Serial.printf("POST failed, HTTP %d: %s\n", status, http.getString().c_str());
    blinkStatus(3, 300);
  }

  http.end();
}

// ---------------------------------------------------------------------------
// Small helper so different outcomes (cooldown / hardware error / success /
// WiFi reset) are distinguishable by blink pattern alone — the probe has no
// screen, this is the only feedback a person gets.
// ---------------------------------------------------------------------------
void blinkStatus(int times, int onMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(onMs);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(onMs);
  }
}
