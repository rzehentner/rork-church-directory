import React from 'react';
import { View, StyleSheet } from 'react-native';

interface DateTimePickerEvent {
  type: string;
  nativeEvent: { timestamp: number };
}

interface Props {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: any;
  textColor?: string;
  accentColor?: string;
}

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const formatDateTime = (d: Date) => `${formatDate(d)}T${formatTime(d)}`;

export default function DateTimePicker({ value, mode = 'date', onChange, minimumDate, maximumDate }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;

    let newDate: Date;
    if (mode === 'time') {
      const [h, m] = val.split(':').map(Number);
      newDate = new Date(value);
      newDate.setHours(h, m, 0, 0);
    } else if (mode === 'datetime') {
      newDate = new Date(val);
    } else {
      newDate = new Date(val + 'T00:00:00');
      newDate.setHours(value.getHours(), value.getMinutes());
    }

    const fakeEvent: DateTimePickerEvent = { type: 'set', nativeEvent: { timestamp: newDate.getTime() } };
    onChange?.(fakeEvent as any, newDate);
  };

  const inputType = mode === 'datetime' ? 'datetime-local' : mode;
  const inputValue =
    mode === 'time' ? formatTime(value) : mode === 'datetime' ? formatDateTime(value) : formatDate(value);

  const getMinMax = (d: Date) => {
    if (mode === 'time') return formatTime(d);
    if (mode === 'datetime') return formatDateTime(d);
    return formatDate(d);
  };

  return (
    <View style={styles.webContainer}>
      <input
        type={inputType}
        value={inputValue}
        onChange={handleChange}
        min={minimumDate ? getMinMax(minimumDate) : undefined}
        max={maximumDate ? getMinMax(maximumDate) : undefined}
        style={{
          fontSize: 16,
          padding: 12,
          borderRadius: 8,
          border: '1px solid #D1D5DB',
          backgroundColor: '#F9FAFB',
          color: '#111827',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    paddingVertical: 8,
  },
});
