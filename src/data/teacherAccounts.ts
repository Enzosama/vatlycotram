// Danh sách giáo viên — mỗi trường 1 cô phụ trách
export interface TeacherAccount {
  id: string;
  name: string;
  schoolCode: string;
  email: string;
}

export const TEACHER_ACCOUNTS: TeacherAccount[] = [
  { id: 'gv-nth-01', name: 'Trần Lê Ngọc Trâm', schoolCode: 'NTH', email: 'cotranlengoctram.vatly@gmail.com' },
  { id: 'gv-nt-01', name: 'Trần Thị Bích Quý', schoolCode: 'NT', email: '' },
  { id: 'gv-tp-01', name: 'Trần Thị Phương Trang', schoolCode: 'TP', email: '' },
];

/** Mật khẩu mặc định cho giáo viên (lần đầu đăng nhập, bắt buộc đổi). */
export const TEACHER_DEFAULT_PASSWORD = 'giaovien@2026';
