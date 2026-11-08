# Milky Way Explorer — Khám phá Ngân Hà

Ứng dụng giáo dục hỗ trợ tiếng Việt, English và 日本語, mở trực tiếp vào cảnh khám phá. Chạy hoàn toàn ở frontend, không cần tài khoản, backend hoặc khóa API.

## Ngôn ngữ và định dạng mã

- `npm run format`: dùng Prettier để định dạng toàn dự án.
- `npm run format:check`: kiểm tra định dạng mà không sửa tệp.
- `.prettierrc.json` dùng dấu nháy đơn, dấu phẩy cuối và độ rộng 100 ký tự. `.prettierignore` bỏ qua dependencies, build output, báo cáo kiểm thử, cache, lockfile và tài nguyên nhị phân. Dự án chưa cấu hình ESLint hoặc script lint; không có quy tắc ESLint nào bị tắt.
- Bản dịch nằm trong `src/i18n/locales/{vi,en,ja}.json`, dùng cùng key theo component/nội dung. `src/i18n/index.ts` cấu hình i18next, fallback tiếng Việt, locale số, metadata và lưu lựa chọn vào `milkyway-language` trong localStorage.
- Thêm nội dung bằng một key có ý nghĩa ở cả ba tệp, dùng `t(key, { ... })` và interpolation cho câu hoàn chỉnh. Với số lượng, dùng hậu tố plural của i18next; không ghép các mảnh câu phụ thuộc ngữ pháp. Các tên thiên thể được lấy theo ID bằng `objectName(id)`; tìm kiếm lập chỉ mục tên từ cả ba bộ dịch cùng bí danh gốc.
- Khi thêm ngôn ngữ, bổ sung tệp dịch, đăng ký trong `languages`, `resources`, `numberLocale`, thêm lựa chọn trong `LanguageSelect` và mở rộng kiểm tra ngôn ngữ. Chạy `npm test` để phát hiện key/placeholder thiếu hoặc lệch, và `npm run test:e2e` để kiểm tra giao diện.
- Dữ liệu vật lý, tọa độ, ID và nguồn trong `src/data` không phụ thuộc ngôn ngữ. Các trường tiếng Việt mặc định tham chiếu bộ dịch `vi`; chỉ phần hiển thị được bản địa hóa. Chuyển ngôn ngữ không remount Canvas hay dispatch lệnh đặt lại camera/mô phỏng.

## Triển khai GitHub Pages

Repository: https://github.com/vtrnguyen/orimilkyway

Trang web: https://vtrnguyen.github.io/orimilkyway/

Sau khi deploy, chạy `npm run test:deployment` để mở Edge/Chromium headless, kiểm tra URL công khai trên desktop/mobile mô phỏng, tải cảnh 3D, đổi ngôn ngữ, hồ sơ tập trung và ghi nhớ lựa chọn. Script dùng Edge đã cài trên máy; có thể cài bằng `npx playwright install msedge`. Có thể kiểm tra preview bằng `npm run test:deployment -- http://127.0.0.1:4173/orimilkyway/`. Ảnh được lưu trong `test-results/`.

Workflow `.github/workflows/deploy.yml` chạy khi push vào `main` hoặc được kích hoạt thủ công: cài dependencies bằng `npm ci` trên Node.js 24, kiểm tra định dạng, chạy unit test, build và xuất bản `dist` lên GitHub Pages. Trong Settings → Pages, Source dùng **GitHub Actions**. Không cần commit thư mục `dist` hoặc khóa truy cập cá nhân.

Vite dùng base `/orimilkyway/` cho production, còn máy chủ phát triển vẫn dùng `/`. Sau `npm run build`, chạy `npm run preview` và mở `http://127.0.0.1:4173/orimilkyway/` để kiểm tra bản production với đúng đường dẫn. Nếu đổi tên repository hoặc dùng tên miền riêng, cập nhật `base` trong `vite.config.ts` cho phù hợp.

## Bản cập nhật Hệ Mặt Trời

Chọn **Hệ Mặt Trời** ở thanh trái (điện thoại: mở **Khám phá** trước), bấm dấu **Hệ Mặt Trời** trong Ngân Hà, hoặc tìm `Trái Đất`, `Earth`, `Sao Mộc`, `Jupiter`… Chọn thiên thể sẽ mở hồ sơ và đưa camera tới cảnh phù hợp. Hai cảnh Ngân Hà và lân cận vẫn hoạt động.

Cảnh mới có Mặt Trời, tám hành tinh theo đúng thứ tự từ trong ra ngoài và Mặt Trăng tùy chọn. Tìm kiếm có bộ lọc **Ngôi sao / Hành tinh / Vệ tinh tự nhiên**; tên “Sao Mộc” không được phân loại thành ngôi sao. Danh mục tìm kiếm có 21 đối tượng, không lặp Mặt Trời. Không thêm Sao Diêm Vương.

### Ba cách xem tỷ lệ

| Chế độ                   | Bán kính mô hình                                                                                                                | Vị trí / khoảng cách                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khám phá (mặc định)      | Mặt Trời 2,6 đơn vị; hành tinh `0,38 × (Rkm / 6371)^0,55`. Giữ thứ tự kích thước nhưng phóng đại các hành tinh so với Mặt Trời. | Tám bán kính quỹ đạo minh họa cách đều: 5 + 3,5 × thứ tự (bắt đầu từ 0). Mặt Trăng cách Trái Đất 1,6 đơn vị. Không phải tỷ lệ thật.                         |
| So sánh kích thước thật  | Mọi thiên thể dùng cùng tỷ lệ tuyến tính: 1 đơn vị = 10.000 km; không tăng các thiên thể nhỏ.                                   | Xếp cạnh nhau theo đường kính và bao cả vành đai; khoảng trống chỉ phục vụ so sánh. Có lựa chọn các hành tinh hoặc thêm Mặt Trời, và bật/tắt Mặt Trăng.     |
| Khoảng cách quỹ đạo thật | Bán kính vẫn phóng đại như chế độ Khám phá và được cảnh báo rõ.                                                                 | Cùng tỷ lệ tuyến tính: 10 đơn vị = 1 AU; dùng bán trục lớn làm bán kính quỹ đạo tròn. Mốc lưới: 1, 5, 10, 20, 30 AU. Quỹ đạo Mặt Trăng tính quanh Trái Đất. |

`1 AU = 149.597.870,7 km`. Bán trục lớn không phải khoảng cách tức thời. Các hồ sơ luôn hiện số liệu vật lý, không đo từ mô hình biến đổi. Dấu định vị và vùng bắt chọn độc lập với bán kính hiển thị; các mô hình quá nhỏ vẫn có locator, không bị âm thầm phóng đại trong cảnh so sánh. Khi thêm Mặt Trời, các tên bị chen nhau được rút gọn thành dấu định vị; rê chuột hoặc dùng Tab để đọc/chọn, hoặc dùng danh mục/tìm kiếm. Kích thước thật không có nghĩa khoảng cách bố trí là thật.

### Chuyển động, ánh sáng và camera

- Một đồng hồ dùng chung cho mọi thiên thể, với tốc độ 0,05 / 0,5 / 2 / 10 / 20 **ngày mô phỏng mỗi giây**. Số ngày hiển thị từ `J + 0`, là mốc minh họa, không phải ngày lịch. Khi tab ẩn, không cộng thời gian; delta mỗi khung hình được giới hạn 0,15 giây để tránh nhảy sau khi thiết bị treo.
- Góc quỹ đạo = `2π × days / orbitalPeriodDays + phase`. Các chu kỳ khác nhau nên hành tinh không chuyển động cùng tốc độ. Pha khởi đầu là số minh họa, không phải kinh độ đo được. Quỹ đạo tròn và đồng phẳng, có ghi **Quỹ đạo giản lược**; chưa tính elip, độ nghiêng quỹ đạo hay ephemeris.
- Tự quay dùng cùng đồng hồ, theo chu kỳ tự quay thiên văn (giờ). Venus/Uranus giữ dấu âm trong dữ liệu; khi dựng dùng trục nghiêng >90° và độ lớn chu kỳ, tránh đảo hướng hai lần. Hướng trục phương vị và kinh tuyến gốc chỉ minh họa. Chu kỳ khí khổng lồ là hệ quy chiếu được NASA mô tả (ví dụ Jupiter/Saturn System III), không phải mọi lớp khí quay cứng cùng tốc độ.
- Tạm dừng dừng cả quỹ đạo và tự quay; camera vẫn xoay, pan và zoom được. Reduced-motion tắt chuyển động theo cài đặt thiết bị. Ở tốc độ cao, tự quay có thể xuất hiện aliasing; có thể giảm tốc để học về tự quay.
- Theo dõi mặc định dịch camera và tâm nhìn theo vị trí hành tinh, giữ offset do người dùng xoay/zoom. Không đặt lại camera mỗi lần đổi tốc độ hoặc tạm dừng. Có thể tắt theo dõi trong hồ sơ. Camera có min/max, mặt phẳng near nhỏ, giới hạn khoảng cách theo bán kính/vành đai và kiểm tra tránh đi vào mô hình.
- Cảnh quỹ đạo dùng point light tại Mặt Trời và ambient yếu; hành tinh dùng MeshStandardMaterial với emissive đen để có phía ngày/đêm. Ánh sáng không suy giảm theo nghịch đảo bình phương trong cảnh giáo dục để các hành tinh ngoài cùng vẫn đọc được — không mô phỏng quang độ học. Không dùng bloom cho hành tinh hay nhãn. Cảnh so sánh dùng đèn studio và có chú thích riêng.
- Sao ở cảnh lân cận vẫn dùng điểm sáng khi xem xa; khi chọn có hình cầu tự phát sáng. Không có hình học ngôi sao năm cánh. Màu sao lấy định tính từ nhiệt độ/quang phổ khi có; trường thiếu dùng trắng trung tính. Bán kính sao và halo tách riêng, không suy bán kính từ độ sáng biểu kiến. Không có chế độ so kích thước sao vì danh mục chưa đủ bán kính có nguồn cho từng thành phần hệ.

### Diện mạo và Credits

Tất cả texture được **tạo bằng thuật toán gốc trong dự án**, không phải ảnh chụp NASA, texture ngẫu nhiên gắn tên hoặc dữ liệu bản đồ địa hình. Không hotlink, không tải tài nguyên ảnh ngoài; không cần giấy phép texture bên thứ ba. Mục **Nguồn dữ liệu & Credits** truy cập từ thanh trái ghi rõ xuất xứ này.

- Mặt Trời: cầu mịn tự phát sáng vàng trắng, biến thiên bề mặt và halo nhẹ, riêng với bán kính cầu.
- Mercury: xám với hố va chạm; Venus: mây vàng kem che bề mặt.
- Earth: biển xanh, các hình lục địa phác thảo thủ công (không phải bản đồ địa lý chính xác), mây riêng và vỏ khí quyển mỏng.
- Mars: đỏ nâu với vùng địa hình và cực sáng; Jupiter: dải mây và xoáy Vết Đỏ Lớn minh họa, thấy rõ tùy phía đang hướng camera.
- Saturn: cầu vàng nhạt với các mesh annulus mỏng, khoảng trống tách vành đai; cùng group trục nghiêng nên vành đai nằm đúng xích đạo. Bán kính và khoảng trống vành đai là lựa chọn đồ họa, không phải số đo cấu trúc vành đai.
- Uranus: xanh lơ nhạt, trục nghiêng 97,77° và có trục chỉ dẫn khi chọn. Neptune: xanh lam dịu, không bão hòa theo ảnh tăng cường màu.
- Moon: xám, vùng tối và hố va chạm. Trong cảnh khoảng cách thật, bán kính phóng đại có thể khiến Moon chồng Earth; cảnh và hồ sơ cảnh báo rõ, dùng tìm kiếm hoặc locator để chọn.

Texture màu dùng `SRGBColorSpace`; bump map dùng `NoColorSpace`. Noise lấy mẫu trong không gian cầu để nối UV seam. Mây/khí quyển đặt ở các bán kính khác nhau, `depthWrite=false` cho lớp trong suốt để tránh z-fighting. Trong cảnh so sánh, các vỏ mây/khí quyển và halo được bỏ để đường biên cầu giữ đúng bán kính tuyến tính. Hình học hình cầu 96×48 (cao) hoặc 56×28 (thấp); texture 512×256 hoặc 256×128. Mesh dùng bán kính trung bình hình cầu, không biểu diễn độ dẹt vật lý của hành tinh.

### Dữ liệu Hệ Mặt Trời và module mới

`src/data/solarSystem.ts` giữ bán kính trung bình thể tích, khối lượng kg, bán trục lớn km, chu kỳ quỹ đạo ngày, chu kỳ tự quay giờ có dấu và độ nghiêng trục. Tách riêng khỏi `src/lib/solarSystem.ts`: đổi AU, bán kính hiển thị, bố trí so sánh, vùng bắt chọn và đồng hồ. `src/data/catalog.ts` hợp nhất tìm kiếm, không nhân đôi Sun. `src/scene/SolarScene.tsx` quản lý cảnh/quỹ đạo/camera, `BodyModel.tsx` dựng cầu/vành đai và `bodySurfaces.ts` tạo texture. `SolarControls.tsx`, `SolarInfo.tsx` và `solar.css` bổ sung giao diện mà không thay công nghệ.

Nguồn đối chiếu ngày **08/11/2026**, liên kết cụ thể hiện trong từng hồ sơ và Credits:

- [Sun](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), [Mercury](https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html), [Venus](https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html), [Earth](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html), [Mars](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html).
- [Jupiter](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html), [Saturn](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html), [Uranus](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html), [Neptune](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html), [Moon](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html).

Không dùng đường kính xích đạo từ bảng tổng hợp chia đôi thay cho bán kính trung bình; ví dụ Jupiter dùng 69.911 km, không phải 71.492 km. Dùng chu kỳ quỹ đạo thiên văn (sidereal), không lẫn chu kỳ tropical. Các số được làm tròn theo bảng nguồn và có thể khác các catalog khác.

Để thêm hành tinh/vệ tinh: thêm bản ghi có nguồn vào `solarSystem.ts`; không chỉnh dữ liệu vật lý để giải quyết bố cục. Với vệ tinh mới cần bổ sung parent hierarchy trong `bodyPosition` (bản hiện tại chỉ hỗ trợ Earth/Moon), và kiểm tra tỷ lệ, vị trí camera, bố cục so sánh. Không gán bán kính của một ngôi sao cho cả hệ sao.

Kiểm thử mới trong `solarSystem.test.ts` kiểm tra đơn vị, bảo toàn tỷ số bán kính, không chồng bố cục, thang khoảng cách tuyến tính, đồng hồ và chuyển cảnh. `tests/solar.spec.ts` kiểm tra cả ba tỷ lệ, đủ tám hành tinh, Moon, tìm kiếm/bộ lọc, camera khi dừng/theo dõi và chế độ 2D; ghi ảnh Earth/Jupiter/Saturn/so sánh trên desktop và viewport điện thoại. Vẫn chưa kiểm tra điện thoại vật lý hoặc toàn bộ GPU; chưa đo FPS. Nội dung dưới đây mô tả thêm các cảnh sao và cách chạy dự án.

Kết quả bàn giao bản cập nhật: **45 unit test và 18 kiểm thử trình duyệt đạt**, build production và TypeScript thành công. Đã xem ảnh desktop/mobile cho Earth, Jupiter, Saturn, so sánh kích thước và zoom gần. Đã sửa và kiểm tra hồi quy việc hủy canvas cũ khi đổi cảnh: đây không còn bị nhận nhầm là lỗi WebGL để chuyển sang 2D. Bản build tách React khỏi Three để đường vào dự phòng 2D không bắt buộc tải chunk đồ họa.

Đã mở trực tiếp bản production qua `vite preview`: tìm Earth/đọc hồ sơ trong 2D không gửi yêu cầu tải các chunk 3D; dấu trong Ngân Hà mở Hệ Mặt Trời và tìm Jupiter mở đúng hồ sơ, không có lỗi console. Bản build vẫn báo chunk đồ họa lớn (khoảng 924 kB chưa gzip); chunk này chỉ cần khi mở cảnh 3D.

## Xem 3D tập trung

Nút **Xem 3D tập trung** mở rộng Canvas hiện có đến toàn bộ vùng ứng dụng và tạm ẩn header, sidebar, thanh công cụ, nhãn và đồng hồ. Nút **Thoát chế độ tập trung** luôn ở góc trên bên phải, chừa safe area và không chồng lên hồ sơ.

Nhấp/chạm ngắn vào thiên thể mở chính `SolarInfo` hoặc `StarInfo`: panel nổi tối đa 320px ở cạnh phải trên desktop, bottom sheet tối đa 46dvh/420px trên mobile và cuộn bên trong. Panel không modal, không có backdrop chặn cảnh và không khóa Tab. Chọn đối tượng khác thay nội dung cùng panel. Escape lần đầu đóng hồ sơ; khi hồ sơ đã đóng, Escape thoát chế độ và trả focus về nút mở. Đóng hồ sơ đưa focus về nút thoát. Phím tắt tìm kiếm bị vô hiệu hóa trong chế độ tập trung.

`immersiveDetailId` tách đối tượng đang đọc hồ sơ khỏi mục tiêu camera trong `useExplorer`. Mở/đóng/đổi hồ sơ không dispatch lệnh điều khiển camera hoặc đồng hồ; các nút Xem gần và Theo dõi vẫn hoạt động khi người dùng yêu cầu. `useScenePicking` kiểm tra toàn bộ cử chỉ cho cả hai cảnh: chỉ chọn khi nhả con trỏ sau một lần nhấn ngắn; bỏ qua kéo quá 8px (kể cả kéo trở về điểm đầu), nhiều ngón, wheel, hủy con trỏ và nhấn giữ. Vùng panel nhận thao tác riêng, vùng cảnh còn lại tiếp tục xoay/pan/zoom.

State trình bày trong `useImmersiveMode.ts` và CSS không gọi Fullscreen API, tải lại trang hoặc remount Canvas. React Three Fiber theo dõi container bằng ResizeObserver để cập nhật drawing buffer và camera projection khi resize/xoay màn hình. Nhãn chỉ tạm ẩn, các panel thông thường được khôi phục khi thoát; fullscreen trình duyệt có sẵn không bị thay đổi.

`tests/immersive.spec.ts` và `tests/immersive-details.spec.ts` kiểm tra năm cảnh, raycasting Earth/Jupiter/Moon, hồ sơ sao, cử chỉ chuột/cảm ứng, Escape, focus, đồng hồ chạy/tạm dừng và identity của Canvas/camera/scene. Ảnh kiểm tra nằm ở `test-results/desktop-focus-before.png`, `desktop-focus-after.png`, `desktop-immersive-details.png` và các ảnh tương ứng tiền tố `mobile-`. Mobile được mô phỏng trong Edge/Chromium, không thay thế kiểm tra trên thiết bị vật lý hoặc Safari/iOS thật.

Chạy `npm run build`, `npm test` và `npm run test:e2e` để kiểm tra TypeScript, bản production, logic cử chỉ và tương tác trên desktop/mobile.

## Cài đặt và chạy

Dùng **Node.js 24 LTS** (hoặc phiên bản Node được Vitest hỗ trợ: `^22.12.0 || ^24.0.0 || >=26.0.0`) và npm.

```sh
npm ci
npm run dev
```

Mở địa chỉ Vite in ra, mặc định `http://127.0.0.1:5173`.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Build tĩnh nằm trong `dist/`; có thể phục vụ bằng bất kỳ static host nào. Các đường dẫn asset mặc định dùng gốc domain. Nếu triển khai vào subdirectory, cấu hình `base` trong `vite.config.ts` tương ứng. Node 23 của môi trường phát triển nằm ngoài dải hỗ trợ chính thức của Vitest 5; nên dùng Node LTS khi cài lại.

## Chức năng

- Toàn cảnh Ngân Hà: point cloud có seed với lõi sáng, bốn nhánh xoắn minh họa, dấu vị trí Hệ Mặt Trời và lưới khoảng cách.
- Cảnh lân cận: Mặt Trời và năm sao có tọa độ đã đối chiếu (Sirius A, Vega, Altair, Barnard’s Star, Proxima Centauri). Các sao dùng khoảng cách tuyến tính, cùng một đơn vị.
- Danh mục 12 bản ghi; phân biệt sao đơn, hệ sao và thành phần hệ sao. Alpha Centauri AB đại diện cặp AB; Proxima là thành phần C riêng. Sirius A đại diện thành phần A, không vẽ Sirius B chồng vị trí.
- Tìm tên và bí danh, không phân biệt hoa/thường và dấu tiếng Việt. `Ctrl/Cmd K` mở tìm kiếm; phím ↑ ↓, Enter, Escape điều khiển gợi ý.
- Chọn sao từ cảnh, điểm đến hoặc kết quả tìm kiếm. Sao có tọa độ tự chuyển sang cảnh lân cận và đưa camera tới sao. Mặt Trời dùng được trong cả hai cảnh. Sao thiếu tọa độ chỉ mở hồ sơ.
- Hồ sơ có đơn vị, giải thích thuật ngữ, nguồn và ghi chú chất lượng. Ô thiếu dữ liệu hiển thị “Chưa có dữ liệu”.
- Xoay, pan, zoom, đặt lại góc nhìn; bật/tắt chuyển động, nhãn, hào quang, lưới và chất lượng thấp/cao.
- Sáu bài kiến thức, hướng dẫn lần đầu có thể bỏ qua và mở lại. Chỉ lưu cờ đã xem hướng dẫn trong localStorage, không lưu dữ liệu cá nhân.
- Giao diện điện thoại có ngăn điều khiển và bảng thông tin phía dưới, tách khỏi vùng tương tác 3D.
- `prefers-reduced-motion` tắt tự xoay, chuyển camera tức thời và vô hiệu hóa bật lại chuyển động khi thiết bị đang yêu cầu giảm chuyển động.
- Khi WebGL 2 không có, lỗi dựng cảnh hoặc mất context: danh mục 2D, tìm kiếm, hồ sơ và bài học vẫn hoạt động. Mở `/?webgl=off` để chủ động kiểm tra dự phòng.

### Điều khiển

| Thao tác           | Máy tính               | Cảm ứng                 |
| ------------------ | ---------------------- | ----------------------- |
| Xoay               | Kéo chuột trái         | Kéo một ngón            |
| Thu phóng          | Cuộn chuột             | Chụm hai ngón           |
| Di chuyển tâm nhìn | Kéo chuột phải         | Kéo hai ngón            |
| Chọn               | Bấm nhãn hoặc ngôi sao | Chạm nhãn hoặc ngôi sao |

Các nhãn là nút HTML dùng được bằng bàn phím. Vùng bắt chọn sao được mở rộng bằng hình cầu trong suốt, không dùng bán kính hình cầu đó làm kích thước vật lý của sao. Có thể tìm và đọc toàn bộ sao qua giao diện HTML mà không tương tác canvas.

## Cấu trúc

```text
src/
  App.tsx                    Giao diện và kết nối các luồng
  styles.css                 Tailwind CSS và kiểu giao diện responsive
  components/
    Search.tsx               Combobox, bí danh, bàn phím
    StarInfo.tsx             Hồ sơ và nguồn
    Modal.tsx                Dialog, focus và Escape
  scene/
    SpaceScene.tsx           BufferGeometry, shader, camera, picking
  state/
    useExplorer.ts           Reducer và theo dõi reduced-motion
  data/
    stars.ts                 Dữ liệu có kiểu và truy vấn danh mục
    lessons.ts               Nội dung giáo dục và liên kết nguồn
  lib/
    astronomy.ts             Chuyển đổi tọa độ, đơn vị, seed và định dạng
    astronomy.test.ts        Kiểm thử toán học, tìm kiếm và trạng thái
tests/
  explorer.spec.ts            Kiểm thử trình duyệt desktop/mobile
```

React + TypeScript + Vite; Three.js qua React Three Fiber/Drei; Tailwind CSS 4. Không tải font, hình ảnh hay danh mục bên ngoài lúc chạy. Hào quang dùng shader/sprite với phép cộng màu có kiểm soát thay cho chuỗi hậu kỳ bloom tốn tài nguyên. Cảnh 3D được tải bất đồng bộ; point cloud có 68.000 hạt ở mức cao hoặc 26.000 ở mức thấp; pixel ratio giới hạn ở 1,7 hoặc 1. Thiết bị màn hình nhỏ hoặc tối đa bốn luồng CPU mặc định mức thấp. Không tạo React component/nguồn sáng riêng cho từng hạt và không set React state mỗi frame. Hình học và texture sinh thủ công được dispose khi thay đổi hoặc tháo cảnh.

## Dữ liệu và nguồn

Dữ liệu là ảnh chụp cục bộ cho giáo dục, đối chiếu ngày **08/11/2026**, không tự đồng bộ. Một số truy vấn trực tiếp SIMBAD bị timeout; các giá trị vị trí sử dụng phần nội dung bản ghi SIMBAD truy cập được qua chỉ mục tìm kiếm. Không khẳng định toàn bộ thuộc tính của 12 bản ghi đều đã xác minh. Các bản ghi chưa đối chiếu đủ chỉ có mô tả và liên kết để đọc thêm; thông số định lượng không được tự điền.

| Bản ghi                                              | Dữ liệu vị trí/khoảng cách được dùng                                                                                                                                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mặt Trời                                             | Gốc của cảnh lân cận; dấu cách tâm ≈26.000 năm ánh sáng trong cảnh Ngân Hà là minh họa. [NASA Sun facts](https://science.nasa.gov/sun/facts/) và [Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).                    |
| Sirius A                                             | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Sirius%20A): ICRS/J2000, thị sai 379,21 mas; dẫn `2007A&A...474..653V`.                                                                                                               |
| Vega                                                 | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Vega): ICRS/J2000, thị sai 130,23 mas; dẫn `2007A&A...474..653V`. Quang phổ A0 V dẫn `2024A&A...690A.176N`.                                                                              |
| Altair                                               | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Altair): ICRS/J2000, thị sai 194,95 mas; dẫn `2007A&A...474..653V`.                                                                                                                   |
| Barnard’s Star                                       | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Barnard%27s%20star): ICRS/J2000, thị sai 546,9759 mas; dẫn `2020yCat.1350....0G`.                                                                                                     |
| Proxima Centauri                                     | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Proxima%20Centauri): ICRS/J2000, dẫn `2020yCat.1350....0G`; khoảng cách ≈4,24 năm ánh sáng phục vụ giáo dục, xem [NASA/ESA](https://science.nasa.gov/asset/hubble/proxima-centauri/). |
| TRAPPIST-1                                           | ≈40 năm ánh sáng, bảy hành tinh theo [NASA Webb](https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-webb-revealing-about-the-trappist-1-system/); không đặt lên bản đồ vì chưa đối chiếu tọa độ trong bản này.       |
| Alpha Centauri AB, Betelgeuse, Rigel, Polaris, Deneb | Hồ sơ tham khảo kèm liên kết SIMBAD đến từng đối tượng. Không có tọa độ hoặc trị số vật lý đã đối chiếu trong bản này.                                                                                                                              |

Các bài học dẫn [NASA Galaxies](https://science.nasa.gov/universe/galaxies/), [NASA Stars](https://science.nasa.gov/universe/stars/), [NASA Light-year](https://science.nasa.gov/exoplanets/what-is-a-light-year/) và Sun facts. Màu sao là màu minh họa, không phải kết quả đo hay ảnh chụp.

## Quy ước tọa độ và đơn vị

Hai cảnh không dùng chung tọa độ:

1. **Ngân Hà:** 1 đơn vị cảnh = 1.000 năm ánh sáng. Tâm tại `(0,0,0)`, đĩa trong mặt phẳng XZ, Y hướng lên. Bốn nhánh sinh theo đường xoắn logarit với seed cố định. Dấu Mặt Trời tại `(21, 0.5, 15.3)` tương ứng bán kính ≈26 đơn vị; góc phương vị và độ cao chỉ minh họa. Đây không phải phép biến đổi từ ICRS sang hệ thiên hà.
2. **Lân cận:** 1 đơn vị cảnh = 1 năm ánh sáng. Gốc tại Mặt Trời, hướng sao dùng ICRS ở epoch J2000. Trục thuận tay phải: +X hướng xích kinh 0h, xích vĩ 0°; +Y hướng thiên cực Bắc; +Z hướng xích kinh 18h, xích vĩ 0°. Do vậy RA 6h hướng về −Z. Không tự cập nhật vị trí theo đồng hồ.

Trong `equatorialToCartesian`, với α = RA giờ × π/12, δ = Dec độ × π/180, r = năm ánh sáng:

```text
x = r cos(δ) cos(α)
y = r sin(δ)
z = −r cos(δ) sin(α)
```

Khoảng cách sao có thị sai: `r = 1000 / parallaxMas × 3.26156`. Nghịch đảo thị sai chỉ dùng cho các sao gần có tỷ số tín hiệu tốt ở đây; không suy rộng thành bộ ước lượng khoảng cách cho sao xa hoặc thị sai nhiễu. Mốc hướng J2000 và phép suy khoảng cách từ thị sai không bao gồm chuyển động riêng, vận tốc xuyên tâm, hiệu ứng quang học hoặc sai số catalog. Mỗi bản ghi tọa độ giữ frame, epoch và nguồn.

## Thêm một ngôi sao

1. Thêm bản ghi theo interface `Star` trong `src/data/stars.ts`: ID duy nhất, tên, aliases, kind, color, mô tả, facts và nguồn cụ thể.
2. Với thông số chưa biết: bỏ trường, không dùng 0 thay dữ liệu thiếu. 0 chỉ hợp lệ nếu thực sự là 0, ví dụ khoảng cách từ Mặt Trời đến chính nó.
3. Chỉ thêm `position` sau khi đối chiếu tọa độ của đúng đối tượng. RA tính bằng **giờ**, Dec bằng **độ**, `frame: 'ICRS'`, `epoch: 'J2000'` và nguồn cụ thể. Cung cấp `distanceLy` có nguồn. Không dùng tọa độ thiên hà trực tiếp, không lấy tọa độ hành tinh thay cho sao chủ.
4. Bản ghi đủ vị trí và khoảng cách tự xuất hiện trong cảnh lân cận. Bản ghi thiếu một trong hai chỉ xuất hiện trong danh mục và hồ sơ.
5. Kiểm tra thang đo của cảnh. Nếu bổ sung sao xa cần mở rộng camera và lưới theo cùng thang tuyến tính hoặc thiết kế một cảnh riêng có giải thích, không kéo khoảng cách tùy ý. Chạy kiểm thử và build.

## Kiểm thử trình duyệt

Playwright dùng Microsoft Edge cài sẵn, headless, không tải thêm Chromium. Môi trường không có Edge có thể đổi `channel` trong `playwright.config.ts` sang `chrome` nếu Chrome đã cài; hoặc cài trình duyệt Playwright và bỏ `channel`. Mặc định cần bật được WebGL 2 (bao gồm SwiftShader trong headless).

```sh
npm run test:e2e
```

Playwright tự chạy Vite và kiểm tra ở desktop 1440×960 và viewport iPhone 13. Viewport mobile được mô phỏng trong Chromium/Edge, không phải kiểm tra Safari/iOS trên thiết bị thật. Test kiểm tra tìm kiếm không dấu qua bàn phím, chọn sao từ nhãn 3D, kéo camera và xác nhận vị trí trở về sau đặt lại, đóng hồ sơ, đổi cảnh, lớp hiển thị, chất lượng, bài học, Escape, focus, reduced-motion, tràn ngang và dự phòng không WebGL. Các ảnh kiểm tra lưu dưới `test-results/` (không đưa vào source control). Trường hợp WebGL bị tắt dùng tham số chủ động; kiểm tra này không mô phỏng mọi lỗi driver GPU.

Các nhãn DOM thuộc cùng React root với giao diện; vị trí được chiếu từ 3D và cập nhật bằng ref mỗi frame, tránh tạo React root riêng cho từng nhãn. Chạy lại các lệnh kiểm thử ở trên để kiểm tra toàn bộ cảnh hiện hành.

## Giới hạn khoa học và kỹ thuật

- Hạt nền/nhánh xoắn không đại diện cho từng sao có thật. Không phải bản đồ đầy đủ của Ngân Hà hoặc công cụ điều hướng thiên văn.
- Hai cảnh dùng hai thang đo và hệ trục riêng. Không hiển thị những sao gần nhau bằng cách phóng đại khoảng cách trong cảnh Ngân Hà.
- Bán kính, độ sáng, màu và hào quang trên màn hình được điều chỉnh để dễ đọc và chọn. Không dùng chúng để so sánh kích thước, độ sáng thực hay đo quang phổ.
- Danh mục nhỏ, một số giá trị còn thiếu; khoảng cách làm tròn và có bất định. Không mô phỏng chuyển động sao/hành tinh, hấp dẫn hoặc trạng thái thời gian thực. Tự xoay là chuyển góc nhìn, không phải tốc độ quay vật lý của thiên hà.
- Không tuyên bố mức FPS. Chất lượng mặc định chỉ là heuristic theo màn hình/số luồng CPU; người dùng có thể giảm chất lượng thủ công. Three.js/Drei vẫn tạo chunk tương đối lớn; cảnh được lazy load và trải nghiệm 2D không cần tải module 3D.
- Chưa kiểm tra toàn bộ thiết bị GPU, thao tác đa chạm trên điện thoại thật, Safari hay công cụ đọc màn hình chuyên dụng.
