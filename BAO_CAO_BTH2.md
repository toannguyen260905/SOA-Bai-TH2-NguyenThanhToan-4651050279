# BÁO CÁO BÀI THỰC HÀNH SỐ 2

**Router, Middleware và bảo mật JWT trong RESTful API**

## 1. Em thực hiện bài như thế nào

Ở bài thực hành số 2, em tiếp tục sử dụng Express.js từ bài 1 để làm chức năng đăng nhập và xác thực bằng JWT. API Hello World ở bài trước có thể gọi trực tiếp, còn trong bài này người dùng phải có token hợp lệ mới truy cập được.

Đầu tiên, em cài các thư viện của project bằng `npm install`. Ngoài Express, bài sử dụng `jsonwebtoken` để tạo và kiểm tra token, `bcryptjs` để băm mật khẩu và `dotenv` để đọc cấu hình từ file `.env`. Dữ liệu người dùng được lưu bằng SQLite.

Sau khi cấu hình khóa JWT, em chạy `npm run seed` để tạo tài khoản mẫu rồi chạy `npm start`. Terminal hiện dòng `Server running at http://localhost:3001`, cho biết server đã chạy. Khi chạy seed, chương trình báo tài khoản đã tồn tại nên không cần tạo lại.

## 2. Phần đăng nhập

Em sử dụng tài khoản mẫu `student` với mật khẩu `Student@123` để thử đăng nhập. Thông tin được lưu trong bảng `User`, gồm bốn cột là `IdUser`, `UserName`, `Password` và `Token`. Mật khẩu trong database được băm bằng bcrypt, còn cột Token lưu token của lần đăng nhập gần nhất.

API đăng nhập là `POST http://localhost:3001/`. Trên Postman, em gửi tên đăng nhập và mật khẩu trong phần Body với dạng JSON. Theo yêu cầu của đề, mật khẩu được chuyển sang Base64 ở client trước khi gửi. Dữ liệu gửi đi tương ứng là:

```json
{
  "userName": "student",
  "password": "U3R1ZGVudEAxMjM="
}
```

Lúc thử trên Postman, em thấy phần Params không có dữ liệu nhưng nhấn Send vẫn đăng nhập thành công. Sau khi xem lại, em hiểu là request này gửi thông tin trong Body nên không cần điền Params. Server lấy thông tin bằng `req.body`, còn Params là dữ liệu gửi kèm trên URL và được đọc bằng `req.query`.

Trong collection, Body dùng các biến `{{userName}}` và `{{passwordBase64}}`. Khi gửi request, Postman thay các biến này bằng giá trị thật. Phần script chạy trước request chuyển mật khẩu sang Base64 nên em không phải nhập lại chuỗi Base64 mỗi lần thử.

Ở phía server, chương trình giải mã mật khẩu, tìm tài khoản trong database rồi dùng `bcrypt.compare()` để kiểm tra. Nếu thông tin đúng thì server tạo JWT, lưu lại và trả token về. Nếu sai tên đăng nhập hoặc mật khẩu thì trả mã `401`.

Khi em gửi request Login với tài khoản mẫu, Postman trả về `200 OK`. Kết quả có token, loại token là `Bearer`, thời hạn `1h` và tên người dùng là `student`.

## 3. Phần JWT và middleware

Sau phần đăng nhập, em tìm hiểu cách dùng token cho những request tiếp theo. JWT có ba phần là `header`, `payload` và `signature`, ngăn cách nhau bằng dấu chấm. Trong bài này, payload chứa ID người dùng, thời điểm tạo và thời điểm hết hạn. Mật khẩu không được đưa vào token.

Em hiểu rằng Base64 có thể giải mã lại, vì vậy nó không phải cách để bảo mật mật khẩu. Bài chỉ dùng Base64 khi gửi dữ liệu theo yêu cầu đề; mật khẩu lưu trong database vẫn được băm bằng bcrypt. Tương tự, đọc được payload của JWT chưa có nghĩa là token hợp lệ, mà server còn phải kiểm tra chữ ký và thời hạn.

Để gửi token, request cần có header:

```http
Authorization: Bearer <token>
```

Phần kiểm tra này nằm trong `auth.middleware.js`. Middleware lấy token từ header rồi gọi `jwt.verify()`. Nếu token hợp lệ và người dùng còn tồn tại, chương trình gán thông tin vào `req.user` và gọi `next()` để tiếp tục xử lý API. Nếu token bị thiếu, sai hoặc hết hạn thì dừng lại và trả mã `401`.

Em dùng chung middleware cho API `/auth` và API Hello World. Các API của bài gồm:

| API | Công việc thực hiện |
| --- | --- |
| `POST /` | Kiểm tra đăng nhập và cấp token |
| `GET /auth` | Kiểm tra token, trả thông tin người dùng |
| `GET /` | Trả `Hello World!` khi có token hợp lệ |

Các đường dẫn này được khai báo trong thư mục `routes`. Phần xử lý đăng nhập nằm trong controller, còn các câu SQL nằm trong `user.repository.js`. Nhờ chia như vậy, em có thể xem riêng phần đường dẫn, phần xử lý và phần truy vấn dữ liệu.

## 4. Kết quả chạy thử

Em dùng collection Postman của bài để kiểm tra các request. Request Login có script lưu token vào biến collection sau khi đăng nhập thành công, nên các request Authenticate và Hello World có thể dùng lại token đó.

Ở lần đăng nhập đã thử trên Postman, kết quả là `200 OK` và mục Test Results hiển thị `2/2`. Kết quả kiểm tra toàn bộ collection bằng Newman cũng ghi nhận 7 request chạy được và 10 kiểm tra đạt. Em tổng hợp kết quả như sau:

| Trường hợp kiểm tra | Kết quả nhận được |
| --- | --- |
| Đăng nhập đúng | `200`, có token và thông tin người dùng |
| Gọi `/auth` với token hợp lệ | `200`, thông báo token hợp lệ |
| Gọi Hello World với token hợp lệ | `200`, trả về `Hello World!` |
| Không gửi token | `401`, báo thiếu token |
| Gửi token sai | `401`, không cho truy cập |
| Nhập sai mật khẩu | `401`, báo sai thông tin đăng nhập |
| Gửi thiếu thông tin đăng nhập | `400`, báo dữ liệu không hợp lệ |

Ngoài collection Postman, bài có các kiểm tra tự động trong file `test/api.test.js`, chạy bằng lệnh `npm test`. Kết quả kiểm tra ngày 28/09/2026 là 8 test đạt, không có test lỗi. Trong đó có các trường hợp token hết hạn, sai chữ ký, sai thuật toán và mở lại database vẫn đọc được dữ liệu đã lưu.

Qua kết quả này, em thấy API Hello World đã được bảo vệ bằng middleware: có token hợp lệ thì nhận được nội dung, còn thiếu hoặc sai token thì bị từ chối.

## 5. Những điều em rút ra sau bài làm

Sau bài này, em hiểu rõ hơn luồng đăng nhập bằng JWT. Người dùng gửi tài khoản và mật khẩu để lấy token, rồi dùng token trong header cho các lần gọi API cần xác thực tiếp theo.

Phần em chú ý nhất là sự khác nhau giữa Body và Params khi dùng Postman. Trước đó em thắc mắc vì sao không nhập gì trong Params mà vẫn gửi được, sau đó em hiểu dữ liệu đã nằm trong Body và được lấy từ các biến của collection.

Em cũng hiểu thêm vai trò của middleware. Thay vì viết lại phần kiểm tra token trong từng API, có thể viết một middleware rồi dùng chung cho nhiều route. Hàm `next()` cho request đi tiếp sau khi kiểm tra thành công.

Bài hiện đã làm được đăng nhập, cấp token, xác thực token và bảo vệ Hello World. Phần đăng ký, phân quyền và đăng xuất chưa được thực hiện. Token cũ cũng chưa bị thu hồi khi đăng nhập lại; nó vẫn có thể sử dụng đến khi hết hạn nếu người dùng còn tồn tại và khóa ký không thay đổi.
