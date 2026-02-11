# Endpoint Readme (Flutter)

Bu doküman, tüm REST endpointlerini ve WebSocket konum kanalını Flutter tarafında nasıl kullanacağınızı ve hangi amaçla çağrılacağını açıklar.

**Base URL**

```
http://SERVER_IP:3000/api
```

**JWT Bearer Token**

Tüm admin endpointleri için `Authorization: Bearer <TOKEN>` gerekir.

---

**Auth (Public)**

**POST** `/auth/register`  
Amaç: Yeni kullanıcı oluşturur ve otomatik token döner. Login sayfasına gitmeden token alırsın.

```dart
final res = await http.post(
  Uri.parse('http://SERVER_IP:3000/api/auth/register'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'user@example.com',
    'password': 'password123',
  }),
);
```

**POST** `/auth/login`  
Amaç: Giriş yapar ve token döner.

```dart
final res = await http.post(
  Uri.parse('http://SERVER_IP:3000/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'user@example.com',
    'password': 'password123',
  }),
);
```

---

**Users (Admin Only)**

**GET** `/users/trackable`  
Amaç: Takip edilebilir (role=user) kullanıcıları listeler.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/users/trackable'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

**GET** `/users`  
Amaç: Tüm kullanıcıları listeler.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/users'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

**GET** `/users/:id`  
Amaç: Belirli kullanıcıyı getirir.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/users/5'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

**GET** `/users/stats/count`  
Amaç: Toplam kullanıcı, admin, user sayısını verir.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/users/stats/count'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

**PATCH** `/users/:id/role`  
Amaç: Kullanıcı rolünü admin veya user yapar.

```dart
final res = await http.patch(
  Uri.parse('http://SERVER_IP:3000/api/users/5/role'),
  headers: {
    'Authorization': 'Bearer $adminToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'role': 'admin', // veya 'user'
  }),
);
```

**DELETE** `/users/:id`  
Amaç: Kullanıcı siler.

```dart
final res = await http.delete(
  Uri.parse('http://SERVER_IP:3000/api/users/5'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

---

**Location (Admin Only)**

Not: Konumlar DB'ye **dakikada 1** yazılır. Canlı takip WebSocket ile yapılır. `last/history` sonuçları en fazla 1 dakikalık gecikme içerir.

**GET** `/location/:userId/last`  
Amaç: Seçilen kullanıcının en son kaydedilmiş konumunu verir.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/location/5/last'),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

**GET** `/location/:userId/history?startDate=...&endDate=...&limit=50&offset=0`  
Amaç: Konum geçmişini getirir.

```dart
final res = await http.get(
  Uri.parse(
    'http://SERVER_IP:3000/api/location/5/history?startDate=2026-02-11T00:00:00Z&endDate=2026-02-11T23:59:59Z&limit=50&offset=0',
  ),
  headers: {'Authorization': 'Bearer $adminToken'},
);
```

---

**Health (Public)**

**GET** `/health`  
Amaç: Servisin ayakta olduğunu kontrol eder.

```dart
final res = await http.get(
  Uri.parse('http://SERVER_IP:3000/api/health'),
);
```

---

**WebSocket — Canlı Konum (User ve Admin)**

**Namespace:** `/location`  
**Amaç:** User canlı konum gönderir, admin canlı konum dinler.

```dart
final socket = io.io(
  'http://SERVER_IP:3000/location',
  io.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': 'Bearer $token'})
      .enableAutoConnect()
      .build(),
);
```

**User → Server**

`update_location`  
Amaç: Konum gönderme. Server her mesajı yayınlar, DB'ye dakikada 1 yazar.

```dart
socket.emit('update_location', {
  'latitude': 41.0082,
  'longitude': 28.9784,
  'accuracy': 5.0,
  'speed': 1.2,
  'heading': 120,
  'altitude': 10.5,
  'deviceTimestamp': DateTime.now().toUtc().toIso8601String(),
});
```

**Admin → Server**

`subscribe_user`  
Amaç: Admin belirli kullanıcıyı canlı takip eder.

```dart
socket.emit('subscribe_user', {
  'userId': 5,
});
```

`unsubscribe_user`  
Amaç: Takibi bırakır.

```dart
socket.emit('unsubscribe_user', {
  'userId': 5,
});
```

`get_online_users`  
Amaç: Online kullanıcı ID listesini döner.

```dart
socket.emit('get_online_users');
```

**Server → Client (Dinlenecek Eventler)**

`location_updated`  
Amaç: Takip edilen kullanıcıdan yeni konum geldiğinde admin tarafına düşer.

```dart
socket.on('location_updated', (data) {
  final payload = Map<String, dynamic>.from(data);
  // payload.userId, payload.latitude, payload.longitude ...
});
```

`location_saved`  
Amaç: User'a konum kaydı sonucu döner. `persisted=false` ise DB'ye yazılmadı, canlı yayınlandı.

```dart
socket.on('location_saved', (data) {
  final payload = Map<String, dynamic>.from(data);
  // payload.persisted -> true/false
});
```

---

**Özet**

1. Kullanıcılar `register` veya `login` ile token alır.  
2. User canlı konumu WebSocket ile gönderir.  
3. Admin WebSocket ile user konumlarını canlı dinler.  
4. REST endpointleri sadece listeleme ve geçmiş içindir.  
