import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { testStorageBucket } from '@/services/event-images'

export default function StorageBucketTest() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const runTest = async () => {
    setTesting(true)
    setResult(null)
    
    try {
      const testResult = await testStorageBucket()
      
      if (testResult.success) {
        setResult('✅ Storage bucket is accessible!')
        Alert.alert('Success', 'Storage bucket is working correctly')
      } else {
        setResult(`❌ Storage bucket error: ${testResult.error}`)
        Alert.alert('Storage Error', testResult.error)
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error'
      setResult(`❌ Test failed: ${errorMsg}`)
      Alert.alert('Test Failed', errorMsg)
    } finally {
      setTesting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Bucket Test</Text>
      <Text style={styles.description}>
        This will test if the 'event-images' storage bucket exists and is accessible.
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={runTest}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Storage Bucket'}
        </Text>
      </TouchableOpacity>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  resultContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultText: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
})