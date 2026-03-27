import { StyleSheet } from 'react-native';

export const createEventStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  saveButtonTextDisabled: {
    color: '#D1D5DB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top' as const,
  },
  inputWithIcon: {
    position: 'relative' as const,
  },
  inputIcon: {
    position: 'absolute' as const,
    left: 12,
    top: 16,
    zIndex: 1,
  },
  inputWithIconText: {
    paddingLeft: 44,
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#111827',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dateTimeSection: {
    gap: 16,
  },
  dateTimeGroup: {
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500' as const,
  },
  roleContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  roleChipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  roleChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  imageUploaderContainer: {
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  imageHelpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  datePicker: {
    height: 120,
    width: '100%',
  },
  datePickerButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center' as const,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  dateRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
});
