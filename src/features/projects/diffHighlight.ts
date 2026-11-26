/**
 * Màu nền cho một dòng BR / Test Plan / Test Case / Unit Test theo thay đổi source gần nhất:
 * xanh = sinh cho method mới thêm, vàng = sinh lại cho method bị sửa, xám viền đỏ = thuộc method đã xóa.
 */
export function diffRowClass(diff: { added: boolean; modified: boolean; deleted: boolean }, fallback = '') {
  if (diff.added) return 'border-l-4 border-l-success bg-success-soft';
  if (diff.deleted) return 'border-l-4 border-l-danger/60 bg-danger/[0.04]';
  if (diff.modified) return 'border-l-4 border-l-warning bg-warning-soft';
  return fallback;
}
