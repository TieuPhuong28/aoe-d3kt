# Thay ảnh icon trong game

Thả ảnh vào đúng thư mục, đúng tên file, rồi tải lại trang game (F5). Không cần sửa code.

- Game tìm `<tên>.png` trước, không có thì dùng `<tên>.svg`, không có cả hai thì dùng emoji cũ.
- Muốn thay một hình: đặt file `.png` cùng tên bên cạnh file `.svg` mẫu (không cần xóa file mẫu).
- Ảnh nên vuông, nền trong suốt, khoảng 64×64 đến 128×128 điểm ảnh. Hình nên đậm, rõ nét vì trên bản đồ chỉ còn khoảng 20 điểm ảnh.

| Tên file | Hình gì | Hiện ở đâu |
|---|---|---|
| `units/vil` | Dân làng | đứng trên vòng màu phe dưới chân |
| `units/vil_idle` | Dân làng đang rảnh | " (thiếu ảnh việc nào thì dùng `units/vil`) |
| `units/vil_berry` | Dân hái quả | " |
| `units/vil_hunt` | Dân săn / xẻ thịt hươu, voi | " |
| `units/vil_farm` | Dân làm ruộng | " |
| `units/vil_wood` | Dân đốn gỗ | " |
| `units/vil_mine` | Dân đào đá, vàng | " |
| `units/vil_build` | Dân đang xây | " |
| `units/club` | Lính chùy | " |
| `units/axe` | Lính rìu | " |
| `units/archer` | Cung thủ | " |
| `units/scout` | Ngựa dò (Đời 2) | " |
| `units/cav` | Kỵ binh (Đời 3) | " |
| `units/sword` | Kiếm sĩ (Đời 3) | " |
| `units/pike` | Lính trường thương (Đời 3, mua ở Trại trường thương) | " |
| `units/archer2` | Cung thủ đồng (Đời 3) | " |
| `units/hcav` | Kỵ binh nặng (Đời 3) | " |
| `units/chariot` | Xe chiến (Đời 3) | " |
| `buildings/city1` | Nhà chính đời 1 | trên ô bản đồ, nền và cờ màu phe |
| `buildings/city2` | Nhà chính đời 2 | " |
| `buildings/city3` | Nhà chính đời 3 (Đồ Đồng) | " |
| `buildings/house` | Nhà dân | trên ô bản đồ, nền và cờ màu phe |
| `buildings/granary` | Kho thực phẩm | " |
| `buildings/storage` | Kho tài nguyên | " |
| `buildings/barracks` | Nhà lính | " |
| `buildings/farm` | Ruộng lúa | " |
| `buildings/range` | Trường bắn cung | " |
| `buildings/stable` | Chuồng ngựa | " |
| `buildings/pikehall` | Trại trường thương (Đời 3) | " |
| `buildings/market` | Chợ | " |
| `buildings/site` | Công trình đang xây | " |
| `animals/deer` | Đàn hươu (còn sống) | trên ô bản đồ |
| `animals/deer_dead` | Xác hươu (đã bị hạ, đang xẻ thịt) | " |
| `animals/elephant` | Voi (còn sống) | " |
| `animals/elephant_dead` | Xác voi | " |
| `res/food` | Thức ăn | thanh tài nguyên, giá tiền, gợi ý |
| `res/wood` | Gỗ | " |
| `res/stone` | Đá | " |
| `res/gold` | Vàng | " |
| `ui/atk`, `ui/def`, `ui/range`, `ui/mp`, `ui/hp` | Icon chỉ số Công, Thủ, Tầm, Di chuyển, Máu | ô chỉ số khi chọn quân |
| `tech/<mã>` | Icon nâng cấp, mã như trong `TECHS` của game.js (`axe`, `tool`, `armInf`, `armArc`, `armCav`, `wood`, `farm`, `stone`, `gold`, `sword`, `archer2`, `arrow`, `hcav`, `yoke`, `bronze`, `brInf`, `brArc`, `brCav`, `wood2`, `stone2`, `gold2`) | ô nâng cấp ở nhà, hàng chờ |

Ví dụ: muốn đổi hình Kỵ binh thì lưu ảnh thành `assets/units/cav.png`.

Ảnh đơn vị `.svg`: phần áo tô màu `#2f6fde` (sáng) và `#1f4fa8` (tối); game tự đổi hai màu này sang màu phe khi vẽ quân địch. Ảnh `.png` thì không đổi màu được, chỉ có vòng màu dưới chân cho biết phe.

Ảnh đẹp nhất khi hình đứng sát đáy khung (chân ở khoảng 9/10 chiều cao), quay mặt sang phải; quân địch được lật ngược tự động.

Các file `.svg` hiện có là art gốc vẽ cho game này. Khi dùng ảnh của người khác, hãy chắc chắn ảnh đó cho phép dùng lại (ví dụ giấy phép CC0).
