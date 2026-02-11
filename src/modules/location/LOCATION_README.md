# 📍 Location Module — Client Kullanım Kılavuzu

NestJS backend üzerindeki gerçek zamanlı konum takibi modülünün client tarafından nasıl kullanılacağını açıklar.

## İçindekiler

- [Mimari Genel Bakış](#mimari-genel-bakış)
- [Gerekli Paketler](#gerekli-paketler)
- [1. Kimlik Doğrulama (JWT Token)](#1-kimlik-doğrulama-jwt-token)
- [2. WebSocket Bağlantısı](#2-websocket-bağlantısı)
- [3. User: Konum Gönderme](#3-user-konum-gönderme)
- [4. Admin: Kullanıcı Takibi](#4-admin-kullanıcı-takibi)
- [5. REST Endpoint'leri](#5-rest-endpointleri)
- [Event Referans Tablosu](#event-referans-tablosu)
- [Payload Şemaları](#payload-şemaları)
- [Hata Yönetimi](#hata-yönetimi)
- [Best Practices](#best-practices)

---

## Mimari Genel Bakış

```
┌──────────────────────────────────────────────────────────┐
│                     NestJS Server                        │
│                                                          │
│   ws://SERVER_URL/location                               │
│                                                          │
│   ┌─────────────┐    room: "user:5"    ┌──────────────┐  │
│   │  User (id:5)│ ──update_location──► │   Gateway    │  │
│   │  📱 Flutter │                      │   ┌──────┐   │  │
│   └─────────────┘                      │   │  DB  │   │  │
│                                        │   └──────┘   │  │
│   ┌─────────────┐  location_updated    │              │  │
│   │ Admin       │ ◄────────────────── │              │  │
│   │ 🖥️ Flutter  │                      └──────────────┘  │
│   └─────────────┘                                        │
└──────────────────────────────────────────────────────────┘
```

**Akış:**  
1. **User** WebSocket'e bağlanır, `update_location` event'i ile konum gönderir  
2. **Server** her konumu canlı yayınlar, DB'ye **dakikada 1 kez** kaydeder  
3. **Admin** `subscribe_user` ile takibe başlar, `location_updated` event'ini dinler

---

## Gerekli Paketler

### Flutter/Dart

```yaml
# pubspec.yaml
dependencies:
  socket_io_client: ^3.0.2
  geolocator: ^13.0.2        # Konum erişimi
  http: ^1.4.0               # REST API çağrıları
```

### JavaScript/TypeScript (Web)

```bash
npm install socket.io-client
```

---

## 1. Kimlik Doğrulama (JWT Token)

WebSocket bağlantısı öncesinde JWT token almanız gerekir.

### Flutter/Dart

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const String baseUrl = 'http://SERVER_IP:3000/api';

  /// Giriş yaparak JWT token al
  static Future<String> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['token']; // JWT token
    }
    throw Exception('Giriş başarısız: ${response.body}');
  }
}
```

### JavaScript

```javascript
const response = await fetch('http://SERVER_IP:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { token } = await response.json();
```

---

## 2. WebSocket Bağlantısı

### Flutter/Dart — Tam Bağlantı Yönetimi

```dart
import 'package:socket_io_client/socket_io_client.dart' as io;

class LocationSocketService {
  late io.Socket _socket;
  bool _isConnected = false;

  /// WebSocket bağlantısını başlat
  void connect(String jwtToken) {
    _socket = io.io(
      'http://SERVER_IP:3000/location',  // ⚠️ namespace: /location
      io.OptionBuilder()
          .setTransports(['websocket'])   // ⚠️ Sadece WebSocket (polling yok)
          .setAuth({'token': 'Bearer $jwtToken'})  // ⚠️ Token gönderim formatı
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)     // 2 saniye sonra tekrar dene
          .build(),
    );

    // ═══════════════════════════════════════
    // Bağlantı Event'leri
    // ═══════════════════════════════════════

    _socket.onConnect((_) {
      print('✅ WebSocket bağlandı');
    });

    // Sunucu bağlantıyı kabul etti
    _socket.on('connection_accepted', (data) {
      _isConnected = true;
      print('✅ Sunucu bağlantıyı kabul etti: $data');
      // data: { message: "Bağlantı başarılı.", userId: 5 }
    });

    _socket.onDisconnect((_) {
      _isConnected = false;
      print('❌ WebSocket bağlantısı kesildi');
    });

    _socket.onReconnect((_) {
      print('🔄 Yeniden bağlanıldı');
    });

    _socket.onReconnectError((_) {
      print('⚠️ Yeniden bağlanma hatası');
    });

    // Sunucu hata mesajları
    _socket.on('error', (data) {
      print('🚨 Sunucu hatası: $data');
      // data: { message: "Token bulunamadı." }
      // data: { message: "Geçersiz veya süresi dolmuş token." }
    });
  }

  /// Bağlantıyı kapat
  void disconnect() {
    _socket.disconnect();
    _socket.dispose();
    _isConnected = false;
  }

  bool get isConnected => _isConnected;
}
```

### JavaScript

```javascript
import { io } from 'socket.io-client';

const socket = io('http://SERVER_IP:3000/location', {
  transports: ['websocket'],
  auth: { token: `Bearer ${jwtToken}` },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

socket.on('connection_accepted', (data) => {
  console.log('Bağlandı:', data);
});

socket.on('error', (data) => {
  console.error('Hata:', data);
});
```

> ⚠️ **ÖNEMLİ:**  
> - Namespace mutlaka `/location` olmalı  
> - Transport mutlaka `['websocket']` olmalı (`polling` desteklenmez)  
> - Token formatı: `"Bearer eyJhbG..."` (auth.token içinde)  
> - Query param ile token **kabul edilmez** (sadece `auth.token`)

---

## 3. User: Konum Gönderme

User rolündeki kullanıcılar `update_location` event'i ile konum gönderir.

### Flutter/Dart

```dart
import 'package:geolocator/geolocator.dart';

class LocationSocketService {
  // ... (bağlantı kodu yukarıdan devam)

  /// Anlık konum gönder
  void sendLocation(Position position) {
    _socket.emitWithAck('update_location', {
      'latitude': position.latitude,          // Zorunlu: -90 ile 90
      'longitude': position.longitude,        // Zorunlu: -180 ile 180
      'accuracy': position.accuracy,          // Opsiyonel: metre
      'speed': position.speed,                // Opsiyonel: m/s
      'heading': position.heading,            // Opsiyonel: 0-360 derece
      'altitude': position.altitude,          // Opsiyonel: metre
      'deviceTimestamp': DateTime.now().toUtc().toIso8601String(), // Zorunlu
    }, ack: (response) {
      // response: { event: "location_saved", data: { success: true, persisted: true/false } }
      print('📍 Konum kaydedildi: $response');
    });
  }

  /// Sürekli konum takibi başlat (arka plan)
  StreamSubscription<Position>? _positionStream;

  void startTracking() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,  // 10 metre hareket edince tetikle
    );

    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      sendLocation(position);
    });
  }

  /// Konum takibini durdur
  void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
  }
}
```

### JavaScript

```javascript
// Konum gönder
socket.emit('update_location', {
  latitude: 41.0082,
  longitude: 28.9784,
  accuracy: 5.0,
  speed: 1.5,
  heading: 180.0,
  altitude: 50.0,
  deviceTimestamp: new Date().toISOString(),
}, (response) => {
  console.log('Kaydedildi:', response);
});
```

> ⚠️ **Rate Limiting:** Sunucu minimum **1 saniye** aralıkla konum kabul eder.  
> Daha sık gönderilen konumlar reddedilir.

---

## 4. Admin: Kullanıcı Takibi

Admin rolündeki kullanıcılar diğer kullanıcıların gerçek zamanlı konumlarını takip edebilir.

### Adım 1: Takip Edilebilir Kullanıcıları Listele (REST)

```dart
// GET /api/users/trackable
Future<List<Map<String, dynamic>>> getTrackableUsers(String token) async {
  final response = await http.get(
    Uri.parse('http://SERVER_IP:3000/api/users/trackable'),
    headers: {'Authorization': 'Bearer $token'},
  );

  final data = jsonDecode(response.body);
  return List<Map<String, dynamic>>.from(data['users']);
  // [ { id: 5, email: "kurye@test.com", role: "user", createdAt: "..." }, ... ]
}
```

### Adım 2: Kullanıcıyı Takibe Al (WebSocket)

```dart
/// Bir kullanıcıyı takibe al
void subscribeToUser(int userId) {
  _socket.emitWithAck('subscribe_user', {
    'userId': userId,
  }, ack: (response) {
    // response: {
    //   event: "subscribed",
    //   data: {
    //     success: true,
    //     userId: 5,
    //     message: "Kullanıcı 5 takibe alındı.",
    //     isOnline: true,
    //     lastLocation: {
    //       latitude: 41.0082,
    //       longitude: 28.9784,
    //       accuracy: 5.0,
    //       speed: 1.5,
    //       heading: 180.0,
    //       deviceTimestamp: "2026-02-11T15:00:00.000Z",
    //       serverTimestamp: "2026-02-11T15:00:01.000Z"
    //     }
    //   }
    // }
    print('Takibe alındı: $response');
  });
}
```

### Adım 3: Gerçek Zamanlı Konum Güncellemelerini Dinle

```dart
/// location_updated event'ini dinle
void listenToLocationUpdates(Function(Map<String, dynamic>) onLocationUpdate) {
  _socket.on('location_updated', (data) {
    // data: {
    //   userId: 5,
    //   email: "kurye@test.com",
    //   latitude: 41.0085,
    //   longitude: 28.9790,
    //   accuracy: 3.0,
    //   speed: 2.1,
    //   heading: 90.0,
    //   altitude: 52.0,
    //   deviceTimestamp: "2026-02-11T15:01:00.000Z",
    //   serverTimestamp: "2026-02-11T15:01:01.000Z"
    // }
    onLocationUpdate(Map<String, dynamic>.from(data));
  });
}
```

### Adım 4: Takipten Çıkar

```dart
void unsubscribeFromUser(int userId) {
  _socket.emitWithAck('unsubscribe_user', {
    'userId': userId,
  }, ack: (response) {
    print('Takipten çıkarıldı: $response');
  });
}
```

### Adım 5: Çevrimiçi Kullanıcıları Sorgula

```dart
void getOnlineUsers() {
  _socket.emitWithAck('get_online_users', {}, ack: (response) {
    // response: { event: "online_users", data: { count: 3, userIds: [5, 8, 12] } }
    print('Çevrimiçi: $response');
  });
}
```

---

## 5. REST Endpoint'leri

WebSocket'e ek olarak, geçmiş sorguları için REST endpoint'leri de mevcuttur.
**Not:** Konumlar DB'ye **dakikada 1 kez** yazıldığı için `last/history` sonuçları
en fazla 1 dakikalık gecikme ile güncellenir.

### Son Konum

```
GET /api/location/:userId/last
Authorization: Bearer <ADMIN_TOKEN>
```

```dart
final response = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/location/5/last'),
  headers: {'Authorization': 'Bearer $adminToken'},
);

// Yanıt:
// {
//   "success": true,
//   "message": "Son konum getirildi.",
//   "location": {
//     "id": 142,
//     "userId": 5,
//     "latitude": 41.0082,
//     "longitude": 28.9784,
//     "accuracy": 5.0,
//     "speed": 1.5,
//     "heading": 180.0,
//     "altitude": 50.0,
//     "deviceTimestamp": "2026-02-11T15:00:00.000Z",
//     "createdAt": "2026-02-11T15:00:01.000Z"
//   }
// }
```

### Konum Geçmişi

```
GET /api/location/:userId/history?startDate=...&endDate=...&limit=50&offset=0
Authorization: Bearer <ADMIN_TOKEN>
```

```dart
final response = await http.get(
  Uri.parse(
    'http://SERVER_IP:3000/api/location/5/history'
    '?startDate=2026-02-11T00:00:00Z'
    '&endDate=2026-02-11T23:59:59Z'
    '&limit=50'
    '&offset=0'
  ),
  headers: {'Authorization': 'Bearer $adminToken'},
);

// Yanıt:
// {
//   "success": true,
//   "message": "Konum geçmişi getirildi.",
//   "total": 142,
//   "count": 50,
//   "locations": [ { ... }, { ... } ]
// }
```

---

## Event Referans Tablosu

### Client → Server (Emit)

| Event | Rol | Payload | Yanıt Event |
|---|---|---|---|
| `update_location` | User | `UpdateLocationPayload` | `location_saved` (bkz. `LocationSavedResponse`) |
| `subscribe_user` | Admin | `{ userId: number }` | `subscribed` |
| `unsubscribe_user` | Admin | `{ userId: number }` | `unsubscribed` |
| `get_online_users` | Admin | `{}` | `online_users` |
| `ping` | Herkes | — | `pong` |

### Server → Client (Dinle)

| Event | Ne Zaman | Payload |
|---|---|---|
| `connection_accepted` | Bağlantı başarılı | `{ message, userId }` |
| `location_updated` | Takip edilen kullanıcı konum gönderdiğinde | `LocationUpdatePayload` |
| `error` | Hata oluştuğunda | `{ message }` |
| `pong` | Ping yanıtı | `{ timestamp }` |

---

## Payload Şemaları

### UpdateLocationPayload (Client → Server)

```typescript
{
  latitude: number;       // Zorunlu, -90 ile 90 arası
  longitude: number;      // Zorunlu, -180 ile 180 arası
  accuracy?: number;      // Opsiyonel, >= 0 (metre)
  speed?: number;         // Opsiyonel, >= 0 (m/s)
  heading?: number;       // Opsiyonel, 0-360 (derece)
  altitude?: number;      // Opsiyonel (metre)
  deviceTimestamp: string; // Zorunlu, ISO 8601 formatı
}
```

### LocationSavedResponse (Server → Client)

```typescript
{
  success: boolean;
  persisted: boolean;   // true = DB'ye kaydedildi, false = sadece canlı yayınlandı
}
```

### LocationUpdatePayload (Server → Client)

```typescript
{
  userId: number;
  email: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  deviceTimestamp: string;   // Cihazın zaman damgası
  serverTimestamp: string;   // Sunucu zaman damgası
}
```

---

## Hata Yönetimi

### Bağlantı Hataları

| Hata | Sebep | Çözüm |
|---|---|---|
| `Token bulunamadı.` | `auth.token` gönderilmedi | Token formatını kontrol et |
| `Geçersiz veya süresi dolmuş token.` | JWT süresi dolmuş | Yeniden login yap |
| `Kullanıcı bulunamadı.` | Token'daki user silinmiş | Yeniden register/login |

### Event Hataları

| Hata | Event | Sebep |
|---|---|---|
| `Çok sık konum gönderimi.` | `update_location` | 1 saniye rate limit aşıldı |
| `Çok sık konum gönderimi. Bağlantı kapatıldı.` | `update_location` | Tekrarlayan rate limit ihlali |
| `Gönderim boyutu çok büyük.` | `update_location` | Payload boyutu limiti aşıldı |
| `Gönderim boyutu çok büyük. Bağlantı kapatıldı.` | `update_location` | Tekrarlayan büyük payload |
| `Geçersiz cihaz zaman damgası.` | `update_location` | deviceTimestamp tolerans dışı |
| `Geçersiz cihaz zaman damgası. Bağlantı kapatıldı.` | `update_location` | Tekrarlayan timestamp ihlali |
| `Bu işlem için admin yetkisi gerekli.` | `subscribe_user` | User rolü ile admin event'i deniyor |
| `Takip edilecek kullanıcı bulunamadı.` | `subscribe_user` | Geçersiz userId |
| `Validasyon hatası: ...` | Herhangi biri | Payload formatı yanlış |

### Flutter/Dart Hata Yakalama

```dart
_socket.on('error', (data) {
  final message = data['message'] ?? 'Bilinmeyen hata';

  if (message.contains('token') || message.contains('Token')) {
    // Token hatası → Yeniden login
    _handleAuthError();
  } else {
    // Diğer hatalar
    print('Hata: $message');
  }
});

_socket.on('exception', (data) {
  // WsException hataları (validasyon, yetki vb.)
  print('Exception: $data');
});
```

---

## Best Practices

### 1. Bağlantı Yönetimi

```dart
// ✅ Doğru: Uygulama yaşam döngüsüne bağla
class LocationSocketService {
  void onAppResume() {
    if (!_isConnected) connect(savedToken);
  }

  void onAppPause() {
    // Arka planda konum göndermeye devam et (gerekiyorsa)
    // veya bağlantıyı kapat
  }

  void onAppDetach() {
    disconnect();
  }
}
```

### 2. Konum Gönderim Aralığı

Sunucu **her dakika 1 kez** DB'ye yazar. Canlı takip için tüm update'leri yayınlar.
Bu yüzden **client tarafında periyot veya hareket bazlı tetikleme zorunludur**.
Sunucu tarafında ayrıca **minimum 1 saniye** rate limit vardır.

**Not:** `deviceTimestamp` sunucu zamanından **±10 dakika** sapmamalıdır.
Tekrarlayan ihlaller bağlantının kapanmasına yol açar.

```dart
// ✅ Doğru: distanceFilter kullan (gereksiz gönderimden kaçın)
const locationSettings = LocationSettings(
  accuracy: LocationAccuracy.high,
  distanceFilter: 10,  // 10 metre hareket edince gönder
);

// ❌ Yanlış: Her saniye sabit gönderim (pil tüketir, rate limit'e takılır)
Timer.periodic(Duration(seconds: 1), (_) => sendLocation());
```

### 3. Token Yenileme

```dart
// ✅ Doğru: Token süresi dolduğunda yeniden bağlan
_socket.on('error', (data) {
  if (data['message']?.contains('token') == true) {
    disconnect();
    final newToken = await AuthService.login(email, password);
    connect(newToken);
  }
});
```

### 4. Network Durumu Kontrolü

```dart
// ✅ Doğru: İnternet yokken bağlantı deneme
import 'package:connectivity_plus/connectivity_plus.dart';

Connectivity().onConnectivityChanged.listen((result) {
  if (result != ConnectivityResult.none && !_isConnected) {
    connect(savedToken);
  }
});
```

---

## Tam Flutter Örneği

```dart
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:geolocator/geolocator.dart';
import 'dart:async';

class LocationTracker {
  late io.Socket _socket;
  StreamSubscription<Position>? _positionStream;

  // ── Bağlan ──
  void connect(String token) {
    _socket = io.io(
      'http://SERVER_IP:3000/location',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': 'Bearer $token'})
          .enableReconnection()
          .build(),
    );

    _socket.on('connection_accepted', (_) => startTracking());
    _socket.on('error', (e) => print('Hata: $e'));
  }

  // ── Konum Gönder ──
  void startTracking() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((pos) {
      _socket.emit('update_location', {
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'accuracy': pos.accuracy,
        'speed': pos.speed,
        'heading': pos.heading,
        'altitude': pos.altitude,
        'deviceTimestamp': DateTime.now().toUtc().toIso8601String(),
      });
    });
  }

  // ── Temizlik ──
  void dispose() {
    _positionStream?.cancel();
    _socket.disconnect();
    _socket.dispose();
  }
}
```
