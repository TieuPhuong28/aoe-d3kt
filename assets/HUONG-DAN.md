# Thay ảnh icon trong game

Thả ảnh vào đúng thư mục, đúng tên file, rồi tải lại trang game (F5). Không cần sửa code.

- Game tìm `<tên>.png` trước, không có thì dùng `<tên>.svg`, không có cả hai thì dùng emoji cũ.
- Muốn thay một hình: đặt file `.png` cùng tên bên cạnh file `.svg` mẫu (không cần xóa file mẫu).
- Ảnh nên vuông, nền trong suốt, khoảng 64×64 đến 128×128 điểm ảnh. Hình nên đậm, rõ nét vì trên bản đồ chỉ còn khoảng 20 điểm ảnh.

| Tên file | Hình gì | Hiện ở đâu |
|---|---|---|
| `units/vil` | Dân làng | trong vòng tròn màu phe |
| `units/club` | Lính chùy | " |
| `units/axe` | Lính rìu | " |
| `units/spear` | Lính giáo | " |
| `units/archer` | Cung thủ | " |
| `units/cav` | Kỵ binh | " |
| `buildings/city1` | Nhà chính đời 1 | trong vòng tròn màu phe |
| `buildings/city2` | Nhà chính đời 2 | " |
| `buildings/house` | Nhà dân | trong ô vuông tối, viền màu phe |
| `buildings/granary` | Kho thực phẩm | " |
| `buildings/storage` | Kho tài nguyên | " |
| `buildings/barracks` | Nhà lính | " |
| `buildings/farm` | Ruộng lúa | " |
| `buildings/range` | Trường bắn cung | " |
| `buildings/stable` | Chuồng ngựa | " |
| `buildings/site` | Công trình đang xây | " |
| `res/food` | Thức ăn | thanh tài nguyên, giá tiền, gợi ý |
| `res/wood` | Gỗ | " |
| `res/stone` | Đá | " |
| `res/gold` | Vàng | " |

Ví dụ: muốn đổi hình Kỵ binh thì lưu ảnh thành `assets/units/cav.png`.

Các file `.svg` hiện có là ảnh mẫu đơn giản. Khi dùng ảnh của người khác, hãy chắc chắn ảnh đó cho phép dùng lại (ví dụ giấy phép CC0).
