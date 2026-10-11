import { NotebookLMProject } from '../types';

export const NOTEBOOKLM_PROJECTS: NotebookLMProject[] = [
  {
    id: 'mindmap-phys10-bai1',
    title: 'Vật Lí 10: Bài 1 – Làm Quen Với Vật Lí',
    courseId: 'course-phys-10-bai1',
    subject: 'Vật lý 10',
    sourceCount: 4,
    audioSummaryDuration: '15:20',
    overview: 'Tổng quan lịch sử và phương pháp nghiên cứu Vật lí: quá trình phát triển qua 3 giai đoạn gắn với 4 cuộc Cách mạng công nghiệp, đối tượng – mục tiêu – vai trò, và hai phương pháp nghiên cứu cốt lõi.',
    keyInsights: [
      'Ba giai đoạn lịch sử: Tiền Vật lí (350 TCN – TK XVI, quan sát và suy luận chủ quan) -> Vật lí cổ điển (TK XVII – cuối TK XIX, phương pháp thực nghiệm) -> Vật lí hiện đại (cuối TK XIX – nay, mô hình lí thuyết Planck & Einstein).',
      'Đối tượng nghiên cứu: các dạng vận động của vật chất và năng lượng. Vật lí là cơ sở của khoa học tự nhiên và công nghệ, nhưng có tác động tiêu cực nếu lạm dụng.',
      'Phương pháp thực nghiệm của Galilei gồm 5 bước; phương pháp mô hình gồm 4 bước với 3 loại mô hình phổ thông (vật chất, lí thuyết, toán học).',
      '4 cuộc Cách mạng công nghiệp: động cơ hơi nước (1765), điện năng (cuối TK XIX), mạch tích hợp IC (1970s), AI/Robot/Nano (đầu TK XXI).',
    ],
    rawMarkdownExport: `# Vật lý Sơ đồ (NotebookLM)
Tổng quan Lịch sử và Phương pháp nghiên cứu Vật lí
- Quá trình phát triển của Vật lí
  - Giai đoạn Tiền Vật lí (350 TCN - Thế kỉ XVI)
    - Quan sát và suy luận chủ quan
    - Mốc tiêu biểu: Aristotle (350 TCN)
  - Giai đoạn Vật lí cổ điển (Thế kỉ XVII - Cuối thế kỉ XIX)
    - Phương pháp thực nghiệm (Galilei, Newton)
    - CMCN lần 1 (1765): Động cơ hơi nước James Watt
    - CMCN lần 2 (Cuối thế kỉ XIX): Điện năng và sản xuất đại trà
  - Giai đoạn Vật lí hiện đại (Cuối thế kỉ XIX - Nay)
    - Mô hình lí thuyết (Planck, Einstein)
    - CMCN lần 3 (1970s): Mạch tích hợp IC, tự động hóa
    - CMCN lần 4 (Đầu thế kỉ XXI): AI, Robot, Nano
- Đối tượng, mục tiêu và vai trò
  - Đối tượng: Các dạng vận động của vật chất và năng lượng
  - Mục tiêu học tập
    - Kiến thức và kĩ năng cơ bản
    - Vận dụng giải quyết vấn đề thực tế
    - Định hướng nghề nghiệp tương lai
  - Vai trò của Vật lí
    - Cơ sở của Khoa học tự nhiên và Công nghệ
    - Tác động tích cực: Phát triển công nghiệp
    - Tác động tiêu cực: Ô nhiễm, vũ khí hủy diệt
- Phương pháp nghiên cứu Vật lí
  - Phương pháp thực nghiệm (Galilei)
    - Bước 1: Xác định vấn đề nghiên cứu
    - Bước 2: Quan sát, thu thập thông tin
    - Bước 3: Đưa ra dự đoán
    - Bước 4: Thí nghiệm kiểm tra
    - Bước 5: Kết luận
  - Phương pháp mô hình
    - Bước 1: Xác định đối tượng mô hình hóa
    - Bước 2: Xây dựng mô hình (giả thuyết)
    - Bước 3: Kiểm tra sự phù hợp
    - Bước 4: Kết luận
  - Các loại mô hình phổ thông
    - Mô hình vật chất (Quả địa cầu)
    - Mô hình lí thuyết (Chất điểm, tia sáng)
    - Mô hình toán học (Vectơ, công thức)`,
    rootNode: {
      id: 'bai1-root',
      label: 'Tổng quan Lịch sử và Phương pháp nghiên cứu Vật lí',
      category: 'core',
      summary: 'Sơ đồ tư duy tổng hợp từ NotebookLM: 3 giai đoạn lịch sử với 4 cuộc Cách mạng công nghiệp, đối tượng – mục tiêu – vai trò của môn Vật lí và hai phương pháp nghiên cứu cốt lõi.',
      citations: ['SGK Vật lí 10', 'NotebookLM – Vật lý Sơ đồ'],
      children: [
        {
          id: 'bai1-history',
          label: 'Quá trình phát triển của Vật lí',
          category: 'concept',
          summary: 'Ba giai đoạn lịch sử gắn liền với 4 cuộc Cách mạng công nghiệp.',
          children: [
            {
              id: 'bai1-h-pre',
              label: 'Giai đoạn Tiền Vật lí (350 TCN - Thế kỉ XVI)',
              category: 'detail',
              summary: 'Quan sát và suy luận chủ quan — mốc tiêu biểu: Aristotle (350 TCN).',
            },
            {
              id: 'bai1-h-classic',
              label: 'Giai đoạn Vật lí cổ điển (Thế kỉ XVII - Cuối thế kỉ XIX)',
              category: 'detail',
              summary: 'Phương pháp thực nghiệm (Galilei, Newton); CMCN lần 1 (1765): động cơ hơi nước James Watt; CMCN lần 2 (cuối thế kỉ XIX): điện năng và sản xuất đại trà.',
            },
            {
              id: 'bai1-h-modern',
              label: 'Giai đoạn Vật lí hiện đại (Cuối thế kỉ XIX - Nay)',
              category: 'detail',
              summary: 'Mô hình lí thuyết (Planck, Einstein); CMCN lần 3 (1970s): mạch tích hợp IC, tự động hóa; CMCN lần 4 (đầu thế kỉ XXI): AI, Robot, Nano.',
            },
          ],
        },
        {
          id: 'bai1-scope',
          label: 'Đối tượng, mục tiêu và vai trò',
          category: 'concept',
          summary: 'Đối tượng nghiên cứu, 3 mục tiêu học tập và vai trò hai mặt của Vật lí.',
          children: [
            {
              id: 'bai1-s-object',
              label: 'Đối tượng nghiên cứu',
              category: 'detail',
              summary: 'Các dạng vận động của vật chất và năng lượng.',
            },
            {
              id: 'bai1-s-goals',
              label: 'Mục tiêu học tập',
              category: 'detail',
              summary: 'Kiến thức và kĩ năng cơ bản; vận dụng giải quyết vấn đề thực tế; định hướng nghề nghiệp tương lai.',
            },
            {
              id: 'bai1-s-role',
              label: 'Vai trò của Vật lí',
              category: 'detail',
              summary: 'Cơ sở của Khoa học tự nhiên và Công nghệ. Tác động tích cực: phát triển công nghiệp. Tác động tiêu cực: ô nhiễm, vũ khí hủy diệt.',
            },
          ],
        },
        {
          id: 'bai1-methods',
          label: 'Phương pháp nghiên cứu Vật lí',
          category: 'concept',
          summary: 'Phương pháp thực nghiệm (5 bước), phương pháp mô hình (4 bước) và các loại mô hình phổ thông.',
          children: [
            {
              id: 'bai1-m-experiment',
              label: 'Phương pháp thực nghiệm (Galilei)',
              category: 'formula',
              summary: 'Bước 1: Xác định vấn đề nghiên cứu -> Bước 2: Quan sát, thu thập thông tin -> Bước 3: Đưa ra dự đoán -> Bước 4: Thí nghiệm kiểm tra -> Bước 5: Kết luận.',
            },
            {
              id: 'bai1-m-model',
              label: 'Phương pháp mô hình',
              category: 'formula',
              summary: 'Bước 1: Xác định đối tượng mô hình hóa -> Bước 2: Xây dựng mô hình (giả thuyết) -> Bước 3: Kiểm tra sự phù hợp -> Bước 4: Kết luận.',
            },
            {
              id: 'bai1-m-types',
              label: 'Các loại mô hình phổ thông',
              category: 'detail',
              summary: 'Mô hình vật chất (quả địa cầu); mô hình lí thuyết (chất điểm, tia sáng); mô hình toán học (vectơ, công thức).',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'mindmap-phys10-bai2',
    title: 'Vật Lí 10: Bài 2 – Các Quy Tắc An Toàn Trong Thực Hành',
    courseId: 'course-phys-10-bai2',
    subject: 'Vật lý 10',
    sourceCount: 1,
    audioSummaryDuration: '14:00',
    overview: 'Bài 2: Các quy tắc an toàn trong phòng thực hành Vật lí — an toàn khi sử dụng thiết bị (điện, nhiệt & thủy tinh, quang học), các nguy cơ mất an toàn và quy tắc thực hành trước, trong và sau thí nghiệm.',
    keyInsights: [
      'Thiết bị điện nguy hiểm nhất: máy biến áp (AC 3-24V), bộ chuyển đổi Adapter AC/DC; phân biệt ký hiệu DC (–) và AC (~), cực dương (+/đỏ) và cực âm (–/xanh).',
      'Nguy cơ mất an toàn chia 3 nhóm: cho người sử dụng (cháy, bỏng, laser vào mắt), hỏng thiết bị (sai thang đo Ampe kế, cắm sai chốt), cháy nổ (chập điện, chất dễ cháy gần mạch).',
      'Quy trình an toàn 3 giai đoạn: đọc kỹ hướng dẫn & xin phép giáo viên; tắt nguồn trước khi cắm/tháo, bố trí dây gọn gàng; sau thí nghiệm vệ sinh và bỏ chất thải đúng nơi.',
      'Nhận biết biển báo an toàn: chất độc, chất ăn mòn, phóng xạ; nguy hiểm điện, nơi cấm lửa; lối thoát hiểm.',
    ],
    rawMarkdownExport: `# Vật lí Sơ đồ (NotebookLM)
Bài 2: Các quy tắc an toàn trong phòng thực hành Vật lí
- An toàn khi sử dụng thiết bị
  - Thiết bị điện
    - Máy biến áp (AC 3-24V)
    - Bộ chuyển đổi Adapter AC/DC
    - Ký hiệu: DC (-), AC (~), Input, Output
    - Cực dương (+/đỏ), Cực âm (-/xanh)
  - Thiết bị nhiệt và thủy tinh
    - Nguy cơ cháy, bỏng
    - Nguy cơ vỡ thủy tinh
  - Thiết bị quang học
    - Dễ mốc, xước, nứt, vỡ
    - Dính bụi làm sai lệch kết quả
- Nguy cơ mất an toàn
  - Cho người sử dụng
    - Cắm/rút phích điện sai cách
    - Dây điện hở
    - Laser chiếu vào mắt
    - Bỏng đèn cồn
  - Hỏng thiết bị
    - Sai thang đo Ampe kế
    - Cắm sai chốt chức năng
  - Cháy nổ
    - Chập điện (kẹp điện gần nhau)
    - Chất dễ cháy gần mạch điện
    - Thiếu găng tay bảo hộ nhiệt
- Quy tắc an toàn thực hành
  - Trước và khi tiến hành
    - Đọc kỹ hướng dẫn, xin phép giáo viên
    - Tắt nguồn điện trước khi cắm/tháo
    - Cắm đúng hiệu điện thế
    - Bố trí dây điện gọn gàng
  - Trong khi thí nghiệm
    - Không tiếp xúc vật nóng
    - Tránh nước gần thiết bị điện
    - Giữ khoảng cách với laser/nung nóng
  - Sau khi thí nghiệm
    - Vệ sinh, dọn dẹp dụng cụ
    - Bỏ chất thải đúng nơi
- Biển báo an toàn
  - Chất độc, chất ăn mòn, phóng xạ
  - Nguy hiểm điện, nơi cấm lửa
  - Lối thoát hiểm`,
    rootNode: {
      id: 'bai2-root',
      label: 'Bài 2: Các quy tắc an toàn trong phòng thực hành Vật lí',
      category: 'core',
      summary: 'Sơ đồ tư duy tổng hợp từ NotebookLM: an toàn khi sử dụng thiết bị, nguy cơ mất an toàn, quy tắc thực hành 3 giai đoạn và biển báo an toàn.',
      citations: ['SGK Vật lí 10', 'NotebookLM – Vật lí Sơ đồ'],
      children: [
        {
          id: 'bai2-equipment-safety',
          label: 'An toàn khi sử dụng thiết bị',
          category: 'concept',
          summary: 'Đặc điểm và nguy cơ của 3 nhóm thiết bị thí nghiệm.',
          children: [
            {
              id: 'bai2-es-electric',
              label: 'Thiết bị điện',
              category: 'detail',
              summary: 'Máy biến áp (AC 3-24V), bộ chuyển đổi Adapter AC/DC. Ký hiệu: DC (–), AC (~), Input, Output. Cực dương (+/đỏ), cực âm (–/xanh).',
            },
            {
              id: 'bai2-es-thermal',
              label: 'Thiết bị nhiệt và thủy tinh',
              category: 'detail',
              summary: 'Nguy cơ cháy, bỏng; nguy cơ vỡ thủy tinh.',
            },
            {
              id: 'bai2-es-optical',
              label: 'Thiết bị quang học',
              category: 'detail',
              summary: 'Dễ mốc, xước, nứt, vỡ; dính bụi làm sai lệch kết quả.',
            },
          ],
        },
        {
          id: 'bai2-risks',
          label: 'Nguy cơ mất an toàn',
          category: 'concept',
          summary: 'Ba nhóm nguy cơ: cho người sử dụng, hỏng thiết bị và cháy nổ.',
          children: [
            {
              id: 'bai2-rk-user',
              label: 'Cho người sử dụng',
              category: 'detail',
              summary: 'Cắm/rút phích điện sai cách; dây điện hở; laser chiếu vào mắt; bỏng đèn cồn.',
            },
            {
              id: 'bai2-rk-device',
              label: 'Hỏng thiết bị',
              category: 'detail',
              summary: 'Sai thang đo Ampe kế; cắm sai chốt chức năng.',
            },
            {
              id: 'bai2-rk-fire',
              label: 'Cháy nổ',
              category: 'detail',
              summary: 'Chập điện (kẹp điện gần nhau); chất dễ cháy gần mạch điện; thiếu găng tay bảo hộ nhiệt.',
            },
          ],
        },
        {
          id: 'bai2-rules',
          label: 'Quy tắc an toàn thực hành',
          category: 'concept',
          summary: 'Quy trình an toàn theo 3 giai đoạn của buổi thực hành.',
          children: [
            {
              id: 'bai2-rl-before',
              label: 'Trước và khi tiến hành',
              category: 'detail',
              summary: 'Đọc kỹ hướng dẫn, xin phép giáo viên; tắt nguồn điện trước khi cắm/tháo; cắm đúng hiệu điện thế; bố trí dây điện gọn gàng.',
            },
            {
              id: 'bai2-rl-during',
              label: 'Trong khi thí nghiệm',
              category: 'detail',
              summary: 'Không tiếp xúc vật nóng; tránh nước gần thiết bị điện; giữ khoảng cách với laser/nung nóng.',
            },
            {
              id: 'bai2-rl-after',
              label: 'Sau khi thí nghiệm',
              category: 'detail',
              summary: 'Vệ sinh, dọn dẹp dụng cụ; bỏ chất thải đúng nơi.',
            },
          ],
        },
        {
          id: 'bai2-signs',
          label: 'Biển báo an toàn',
          category: 'concept',
          summary: 'Các biển báo cần nhận biết trong phòng thực hành.',
          children: [
            {
              id: 'bai2-sg-hazard',
              label: 'Chất độc, chất ăn mòn, phóng xạ',
              category: 'detail',
              summary: 'Biển báo cảnh báo hóa chất nguy hiểm và nguồn phóng xạ.',
            },
            {
              id: 'bai2-sg-electric',
              label: 'Nguy hiểm điện, nơi cấm lửa',
              category: 'detail',
              summary: 'Khu vực có điện áp cao và nghiêm cấm nguồn lửa, chất dễ cháy.',
            },
            {
              id: 'bai2-sg-exit',
              label: 'Lối thoát hiểm',
              category: 'detail',
              summary: 'Xác định lối thoát hiểm trước khi bắt đầu buổi thực hành.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'mindmap-phys10-bai3',
    title: 'Vật Lí 10: Bài 3 – Sai Số Trong Thực Hành',
    courseId: 'course-phys-10-bai3',
    subject: 'Vật lý 10',
    sourceCount: 2,
    audioSummaryDuration: '16:00',
    overview: 'Thực hành tính sai số và ghi kết quả đo: phân loại phép đo, phân loại sai số, các bước tính sai số phép đo trực tiếp, sai số phép đo gián tiếp và cách ghi kết quả đo.',
    keyInsights: [
      'Phân biệt phép đo trực tiếp (đọc trực tiếp trên dụng cụ) và phép đo gián tiếp (tính qua công thức liên hệ).',
      'Sai số hệ thống do dụng cụ (ΔAdc) hoặc chủ quan; sai số ngẫu nhiên do thao tác, điều kiện, giác quan.',
      'Quy trình 4 bước: tính giá trị trung bình Ā -> sai số tuyệt đối trung bình ΔĀ -> ΔA = ΔĀ + ΔAdc -> sai số tỉ đối δA.',
      'Tổng/hiệu (A = B ± C): cộng sai số tuyệt đối ΔA = ΔB + ΔC. Tích/thương: cộng sai số tỉ đối δA = δB + δC.',
    ],
    rawMarkdownExport: `# Sai số Sơ đồ (NotebookLM)
Bài 3: Thực hành tính sai số và ghi kết quả đo
- Phân loại phép đo
  - Phép đo trực tiếp: Đọc trực tiếp trên dụng cụ
  - Phép đo gián tiếp: Tính qua công thức liên hệ
- Phân loại sai số
  - Sai số hệ thống: Do dụng cụ (ΔAdc) hoặc chủ quan
  - Sai số ngẫu nhiên: Do thao tác, điều kiện, giác quan
- Các bước tính sai số đo trực tiếp
  - B1: Giá trị trung bình Ā = (A1+A2+...+An)/n
  - B2: Sai số tuyệt đối trung bình ΔĀ = (ΔA1+ΔA2+...+ΔAn)/n
  - B3: Sai số tuyệt đối phép đo ΔA = ΔĀ + ΔAdc
  - B4: Sai số tỉ đối δA = (ΔA / Ā) x 100%
- Sai số phép đo gián tiếp
  - Tổng/Hiệu (A=B±C): ΔA = ΔB + ΔC
  - Tích/Thương (A=B.C hoặc B/C): δA = δB + δC
- Cách ghi kết quả đo
  - Công thức ghi: A = Ā ± ΔA
  - ΔA viết đến chữ số có nghĩa đơn vị ĐCNN
  - Ā viết đến bậc thập phân tương ứng ΔA`,
    rootNode: {
      id: 'bai3-root',
      label: 'Bài 3: Thực hành tính sai số và ghi kết quả đo',
      category: 'core',
      summary: 'Tổng hợp toàn bộ nội dung sơ đồ tư duy từ NotebookLM: phân loại phép đo, phân loại sai số, quy trình tính sai số và cách ghi kết quả đo.',
      citations: ['SGK Vật lí 10', 'NotebookLM – Sai số Sơ đồ'],
      children: [
        {
          id: 'bai3-classify-measure',
          label: 'Phân loại phép đo',
          category: 'concept',
          summary: 'Hai dạng phép đo cơ bản trong thực hành Vật lí.',
          children: [
            {
              id: 'bai3-cm1',
              label: 'Phép đo trực tiếp',
              category: 'detail',
              summary: 'Đọc trực tiếp trên dụng cụ.',
            },
            {
              id: 'bai3-cm2',
              label: 'Phép đo gián tiếp',
              category: 'detail',
              summary: 'Tính qua công thức liên hệ.',
            },
          ],
        },
        {
          id: 'bai3-classify-error',
          label: 'Phân loại sai số',
          category: 'concept',
          summary: 'Hai loại sai số phát sinh khi thực hiện phép đo.',
          children: [
            {
              id: 'bai3-ce1',
              label: 'Sai số hệ thống',
              category: 'detail',
              summary: 'Do dụng cụ (ΔAdc) hoặc chủ quan.',
            },
            {
              id: 'bai3-ce2',
              label: 'Sai số ngẫu nhiên',
              category: 'detail',
              summary: 'Do thao tác, điều kiện, giác quan.',
            },
          ],
        },
        {
          id: 'bai3-direct-steps',
          label: 'Các bước tính sai số đo trực tiếp',
          category: 'concept',
          summary: 'Quy trình 4 bước xử lí kết quả đo trực tiếp.',
          children: [
            {
              id: 'bai3-ds1',
              label: 'B1: Giá trị trung bình',
              category: 'formula',
              summary: 'Ā = (A1+A2+...+An)/n',
            },
            {
              id: 'bai3-ds2',
              label: 'B2: Sai số tuyệt đối trung bình',
              category: 'formula',
              summary: 'ΔĀ = (ΔA1+ΔA2+...+ΔAn)/n',
            },
            {
              id: 'bai3-ds3',
              label: 'B3: Sai số tuyệt đối phép đo',
              category: 'formula',
              summary: 'ΔA = ΔĀ + ΔAdc',
            },
            {
              id: 'bai3-ds4',
              label: 'B4: Sai số tỉ đối',
              category: 'formula',
              summary: 'δA = (ΔA / Ā) x 100%',
            },
          ],
        },
        {
          id: 'bai3-indirect-error',
          label: 'Sai số phép đo gián tiếp',
          category: 'concept',
          summary: 'Quy tắc truyền sai số cho phép đo gián tiếp.',
          children: [
            {
              id: 'bai3-ie1',
              label: 'Tổng/Hiệu (A=B±C)',
              category: 'formula',
              summary: 'ΔA = ΔB + ΔC',
            },
            {
              id: 'bai3-ie2',
              label: 'Tích/Thương (A=B.C hoặc B/C)',
              category: 'formula',
              summary: 'δA = δB + δC',
            },
          ],
        },
        {
          id: 'bai3-write-result',
          label: 'Cách ghi kết quả đo',
          category: 'concept',
          summary: 'Quy ước trình bày kết quả phép đo.',
          children: [
            {
              id: 'bai3-wr1',
              label: 'Công thức ghi',
              category: 'formula',
              summary: 'A = Ā ± ΔA',
            },
            {
              id: 'bai3-wr2',
              label: 'ΔA viết đến chữ số có nghĩa đơn vị ĐCNN',
              category: 'detail',
              summary: 'Làm tròn sai số tuyệt đối đến đơn vị đo chia nhỏ nhất.',
            },
            {
              id: 'bai3-wr3',
              label: 'Ā viết đến bậc thập phân tương ứng ΔA',
              category: 'detail',
              summary: 'Giá trị trung bình được viết đến cùng bậc thập phân với sai số tuyệt đối.',
            },
          ],
        },
      ],
    },
  },
];
