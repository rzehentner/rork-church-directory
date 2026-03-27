import NativeDateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

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

export default function DateTimePicker(props: Props) {
  return <NativeDateTimePicker {...props} />;
}
