import type { AppTab } from '../components/Header';

/**
 * Route resolver cho EduLearn — ánh xạ URL path sang trạng thái điều hướng.
 * Không phụ thuộc React (chỉ import type), nên test được bằng bun script thuần.
 */

export interface RouteResolution {
  /** Tab cần hiển thị */
  tab: AppTab;
  /** Có mở trang cá nhân (modal) hay không */
  openProfile: boolean;
  /** Có phải trang quản trị /m@nagement hay không */
  isManagement: boolean;
}

interface RouteEntry {
  tab: AppTab;
  openProfile?: boolean;
  isManagement?: boolean;
}

/** Bảng ánh xạ path (đã chuẩn hoá, viết thường) -> trạng thái điều hướng. */
const ROUTE_MAP: Record<string, RouteEntry> = {
  '/': { tab: 'courses' },
  '/courses': { tab: 'courses' },
  '/khoa_hoc': { tab: 'courses' }, // alias tiếng Việt
  '/learning': { tab: 'learning' },
  '/hoc_bai': { tab: 'learning' }, // alias tiếng Việt
  '/rank': { tab: 'leaderboard' },
  '/leaderboard': { tab: 'leaderboard' }, // alias
  '/xep_hang': { tab: 'leaderboard' }, // alias tiếng Việt
  '/trang_ca_nhan': { tab: 'courses', openProfile: true },
  '/profile': { tab: 'courses', openProfile: true }, // alias
  '/m@nagement': { tab: 'management', isManagement: true },
};

const FALLBACK: RouteResolution = {
  tab: 'courses',
  openProfile: false,
  isManagement: false,
};

/** Chuẩn hoá path: bỏ query, bỏ trailing slash (trừ root), viết thường. */
function normalizePath(path: string): string {
  if (!path) return '/';
  let p = path.trim().toLowerCase();
  const qIndex = p.indexOf('?');
  if (qIndex >= 0) p = p.slice(0, qIndex);
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');
  return p || '/';
}

function toResolution(entry: RouteEntry): RouteResolution {
  return {
    tab: entry.tab,
    openProfile: entry.openProfile ?? false,
    isManagement: entry.isManagement ?? false,
  };
}

/**
 * Phân giải URL thành trạng thái điều hướng.
 *
 * @param path   window.location.pathname (ví dụ '/rank')
 * @param hash   window.location.hash (ví dụ '#/rank') — mặc định rỗng
 * @param search window.location.search (ví dụ '?x=1') — mặc định rỗng
 *
 * Thứ tự ưu tiên:
 * 1. Bất kỳ path/hash/search nào chứa 'm@nagement' -> trang quản trị
 *    (giữ tương thích ngược với checkIsManagementRoute cũ).
 * 2. Path chính khớp ROUTE_MAP.
 * 3. Hash routing kiểu '/#/rank'.
 * 4. Fallback về '/courses'.
 */
export function resolveRoute(
  path: string,
  hash: string = '',
  search: string = ''
): RouteResolution {
  const combined = `${path} ${hash} ${search}`.toLowerCase();

  // 1. Tương thích ngược: bất kỳ đâu chứa 'm@nagement' đều là trang quản trị.
  if (combined.includes('m@nagement')) {
    return { tab: 'management', openProfile: false, isManagement: true };
  }

  // 2. Path chính (bỏ qua nếu là root '/' mà có hash route thì ưu tiên hash).
  const normPath = normalizePath(path);
  const hit = ROUTE_MAP[normPath];
  if (hit && !(normPath === '/' && hash)) {
    return toResolution(hit);
  }

  // 3. Hash routing kiểu '/#/rank'.
  if (hash && hash.startsWith('#')) {
    const normHash = normalizePath(hash.slice(1));
    const hashHit = ROUTE_MAP[normHash];
    if (hashHit) return toResolution(hashHit);
  }

  // 4. Fallback (path '/' không có hash đã trả về ở bước 2).
  return { ...FALLBACK };
}

/**
 * Ngược lại: tab -> path để pushState.
 */
export function pathForTab(tab: AppTab, openProfile: boolean = false): string {
  if (openProfile) return '/trang_ca_nhan';
  switch (tab) {
    case 'learning':
      return '/learning';
    case 'leaderboard':
      return '/rank';
    case 'management':
      return '/m@nagement';
    case 'courses':
    case 'notebooklm':
    default:
      return '/';
  }
}
