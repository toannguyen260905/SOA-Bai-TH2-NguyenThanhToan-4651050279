# BÁO CÁO BÀI THỰC HÀNH SỐ 2

**Nội dung:** Router, Middleware và bảo mật JWT trong RESTful API  
**Framework sử dụng:** Express.js

## 1. Yêu cầu bài thực hành

Trong bài này, em sử dụng Express.js để làm chức năng đăng nhập và xác thực người dùng bằng JWT. Sau khi đăng nhập thành công, người dùng nhận được token để truy cập các API cần xác thực.

Các nội dung cần thực hiện gồm:

- Sử dụng Router để khai báo các API.
- Làm API đăng nhập, kiểm tra tài khoản và cấp JWT.
- Làm API `/auth` để xác thực token.
- Viết middleware kiểm tra token cho API Hello World của bài 1.
- Kiểm tra kết quả bằng Postman.

## 2. Các công cụ và thư viện sử dụng

| Công cụ, thư viện | Mục đích sử dụng |
| --- | --- |
| Node.js và Express.js | Chạy server và xây dựng API |
| jsonwebtoken | Tạo token và kiểm tra token |
| bcryptjs | Băm mật khẩu và so sánh khi đăng nhập |
| dotenv | Đọc cấu hình trong file `.env` |
| SQLite | Lưu tài khoản và token |
| Postman | Gửi yêu cầu để kiểm tra API |

Em dùng SQLite để lưu dữ liệu ngay trong project. Địa chỉ chạy chương trình mặc định là `http://localhost:3001`.

## 3. Nội dung thực hiện

### 3.1. Tạo bảng người dùng

Bảng `User` có các cột theo đề bài:

| Tên cột | Kiểu dữ liệu | Nội dung lưu |
| --- | --- | --- |
| IdUser | INTEGER, khóa chính, tự tăng | Mã người dùng |
| UserName | VARCHAR(255) | Tên đăng nhập, không được trùng |
| Password | VARCHAR(255) | Mật khẩu đã băm |
| Token | VARCHAR(255) | Token của lần đăng nhập gần nhất |

Tài khoản mẫu dùng để thử chương trình là `student`, mật khẩu `Student@123`. File `scripts/seed.js` tạo tài khoản này. Nếu tài khoản đã có thì chương trình giữ nguyên dữ liệu.

### 3.2. Chia các file xử lý

Em chia chương trình thành các phần để dễ theo dõi:

- `server.js`: khởi động server.
- `app.js`: ghép các route và middleware.
- `routes`: khai báo đường dẫn và phương thức của API.
- `controllers/auth.controller.js`: xử lý đăng nhập và trả kết quả xác thực.
- `middleware/auth.middleware.js`: kiểm tra token trước khi cho truy cập API.
- `repositories/user.repository.js`: chứa các câu lệnh truy vấn người dùng.
- `db.js`: tạo và kết nối database.
- `config.js`: đọc cấu hình như cổng chạy, khóa JWT và thời hạn token.

### 3.3. Làm API đăng nhập

API đăng nhập sử dụng phương thức `POST` với đường dẫn `/`.

Trên Postman, dữ liệu được gửi trong **Body → raw → JSON**:

```json
{
  "userName": "student",
  "password": "U3R1ZGVudEAxMjM="
}
```

Chuỗi `U3R1ZGVudEAxMjM=` là mật khẩu `Student@123` đã chuyển sang Base64 tại client theo yêu cầu đề bài. Trong collection, script của Postman thực hiện bước chuyển đổi này trước khi gửi.

Server lấy thông tin từ `req.body`, giải mã mật khẩu rồi kiểm tra với dữ liệu trong bảng User bằng `bcrypt.compare()`. Nếu đúng thì tạo JWT, lưu token và trả về cho client. Nếu sai tên đăng nhập hoặc mật khẩu thì trả mã `401`.

Dữ liệu đăng nhập nằm trong Body nên tab Params có thể để trống. Params chỉ dùng khi cần gửi dữ liệu trên URL, còn API này không đọc tài khoản từ đó.

Kết quả đăng nhập thành công có dạng như sau (`<token>` là phần viết gọn của JWT):

```json
{
  "token": "<token>",
  "tokenType": "Bearer",
  "expiresIn": "1h",
  "user": {
    "id": 1,
    "userName": "student"
  }
}
```

### 3.4. Tạo và kiểm tra JWT

JWT gồm ba phần, được ngăn cách bằng dấu chấm:

```text
header.payload.signature
```

- Header chứa loại token và thuật toán ký. Trong bài dùng HS256.
- Payload chứa ID người dùng (`sub`), thời điểm tạo (`iat`) và thời điểm hết hạn (`exp`).
- Signature là chữ ký để kiểm tra token có hợp lệ hay không.

Token mặc định có hiệu lực trong 1 giờ. Khóa ký và thời hạn token được cấu hình trong `.env`. Mật khẩu không được đưa vào token.

Base64 có thể giải mã lại nên không dùng để lưu mật khẩu an toàn. Trong database, mật khẩu được lưu dưới dạng hash của bcrypt. Với JWT, xem được nội dung payload chưa có nghĩa là token hợp lệ, vẫn phải kiểm tra bằng `jwt.verify()`.

### 3.5. Viết middleware bảo vệ API

Khi gọi API cần xác thực, client gửi token trong header:

```http
Authorization: Bearer <token>
```

Middleware lấy token, kiểm tra chữ ký và thời hạn, sau đó tìm người dùng theo ID trong token. Nếu hợp lệ, middleware gán người dùng vào `req.user` và gọi `next()` để chạy phần xử lý API. Nếu thiếu token, token sai hoặc hết hạn thì trả mã `401`.

Em sử dụng middleware này cho cả API `/auth` và API Hello World.

| Phương thức | Đường dẫn | Chức năng | Cần token |
| --- | --- | --- | --- |
| POST | `/` | Đăng nhập và nhận token | Không |
| GET | `/auth` | Kiểm tra token và trả thông tin người dùng | Có |
| GET | `/` | Trả về `Hello World!` | Có |

## 4. Kết quả chạy thử

### 4.1. Kiểm tra bằng Postman

Khi gửi request Login với tài khoản mẫu, Postman trả về **200 OK**. Phần kết quả có JWT, thời hạn `1h` và thông tin người dùng `student`. Hai kiểm tra đi kèm request Login đều đạt (`2/2`).

Collection có sẵn các request để thử lần lượt đăng nhập, xác thực, Hello World và các trường hợp lỗi. Kết quả chạy collection bằng Newman (công cụ chạy collection Postman) là **7 request, 10 kiểm tra đạt, không có lỗi**.

| Trường hợp | Kết quả |
| --- | --- |
| Đăng nhập đúng tài khoản và mật khẩu | 200, nhận được token |
| Gọi `/auth` với token hợp lệ | 200, trả thông báo token hợp lệ và thông tin người dùng |
| Gọi Hello World với token hợp lệ | 200, trả `Hello World!` |
| Gọi API mà không gửi token | 401, báo thiếu token |
| Gửi token không hợp lệ | 401, không cho truy cập |
| Nhập sai mật khẩu | 401, báo sai thông tin đăng nhập |
| Gửi thiếu thông tin đăng nhập | 400, báo dữ liệu không hợp lệ |

### 4.2. Kiểm tra bằng lệnh npm test

Chương trình có file `test/api.test.js` để kiểm tra thêm các trường hợp như token hết hạn, sai chữ ký, sai thuật toán và dữ liệu đầu vào không hợp lệ.

Chạy trong thư mục `Lab-2`:

```powershell
npm test
```

Kết quả kiểm tra ngày 28/09/2026 là **8 test đạt, 0 test lỗi**, gồm một test tổng và bảy test con. Các kiểm tra cũng xác nhận token được lưu, mật khẩu được băm và dữ liệu vẫn còn khi mở lại database. Phần test sử dụng database tạm riêng.

## 5. Cách chạy và demo bài

Để chạy lần đầu, cài thư viện bằng `npm install`, tạo file `.env` từ `.env.example` nếu chưa có và điền khóa `JWT_SECRET`. Sau đó chạy:

```powershell
npm run seed
npm start
```

Khi server chạy, mở Postman và import file `postman/Lab-2.postman_collection.json`. Thứ tự demo là:

1. Gửi **01 Login** để đăng nhập và lấy token. Postman tự lưu token vào biến collection.
2. Gửi **02 Authenticate** để kiểm tra token.
3. Gửi **03 Hello World** để xem kết quả khi có token hợp lệ.
4. Gửi các request còn lại để xem lỗi khi thiếu token, token sai hoặc sai mật khẩu.

Để thử token hết hạn, có thể đổi `JWT_EXPIRES_IN=5s`, khởi động lại server rồi đăng nhập lại. Sau khi đợi hơn 5 giây, gọi `/auth` sẽ nhận `401`. Khi demo xong, đổi thời hạn về `1h`.

## 6. Nhận xét sau khi thực hiện

Bài làm đã thực hiện được chức năng đăng nhập, cấp JWT và xác thực trước khi truy cập API Hello World. Các trường hợp đúng trả về kết quả, còn trường hợp thiếu hoặc sai thông tin thì có thông báo lỗi tương ứng.

Qua bài này, em hiểu rõ hơn cách dùng Router để chia API, cách middleware kiểm tra request trước khi xử lý và cách gửi token trong header. Em cũng phân biệt được dữ liệu gửi trong Body với Params, cũng như Base64 với việc băm mật khẩu.

Bài hiện mới có tài khoản mẫu để thử đăng nhập, chưa làm đăng ký, phân quyền hoặc đăng xuất. Token cũ vẫn có thể dùng đến khi hết hạn nếu người dùng còn tồn tại và khóa ký không thay đổi; đăng nhập lại chưa thu hồi token cũ.
