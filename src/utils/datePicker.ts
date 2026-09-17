import { Platform } from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

/**
 * Android fires onChange once and expects the caller to unmount the dialog —
 * leaving it mounted re-renders it and the calendar reopens with no way out.
 * iOS keeps its inline picker up until the screen's own Done button.
 * `event.type` is 'dismissed' on cancel, where Android still passes back the
 * highlighted date; without the check a cancel silently writes it.
 */
export function onDatePicked(
  setShow: (visible: boolean) => void,
  setDate: (date: Date) => void,
) {
  return (event: DateTimePickerEvent, date?: Date): void => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && date) setDate(date);
  };
}
