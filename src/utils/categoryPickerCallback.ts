type CategorySelection = { id: number; name: string } | null;
type Callback = (cat: CategorySelection) => void;

let pending: Callback | null = null;

export function setCategoryPickerCallback(cb: Callback) {
  pending = cb;
}

export function resolveCategoryPicker(cat: CategorySelection) {
  if (pending) {
    pending(cat);
    pending = null;
  }
}
