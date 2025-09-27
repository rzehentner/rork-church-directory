import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { testStorageBucket, testStorageWrite } from '@/services/event-images'
import { debugEnvironment } from '@/lib/constants'

export default function StorageBucketTest() {
  const [testing, setTesting] = useState(false)
  const [testingWrite, setTestingWrite] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [writeResult, setWriteResult] = useState<string | null>(null)

  useEffect(() => {
    // Debug environment on component mount
    debugEnvironment()
  }, [])

  const runTest = async () => {
    setTesting(true)
    setResult(null)
    
    try {
      const testResult = await testStorageBucket()
      setResult(testResult)
      
      if (testResult.includes('✅')) {
        Alert.alert('Success', 'Storage bucket is working correctly')
      } else {
        Alert.alert('Storage Error', testResult)
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error'
      setResult(`❌ Test failed: ${errorMsg}`)
      Alert.alert('Test Failed', errorMsg)
    } finally {
      setTesting(false)
    }
  }

  const runWriteTest = async () => {
    setTestingWrite(true)
    setWriteResult(null)
    
    try {
      // Use a test event ID
      const testEventId = 'test-' + Date.now()
      const testResult = await testStorageWrite(testEventId)
      
      if (testResult.success) {
        setWriteResult('✅ Storage write test successful!')
        Alert.alert('Success', 'Storage write permissions are working correctly')
      } else {
        setWriteResult(`❌ Storage write error: ${testResult.error}`)
        Alert.alert('Storage Write Error', testResult.error)
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error'
      setWriteResult(`❌ Write test failed: ${errorMsg}`)
      Alert.alert('Write Test Failed', errorMsg)
    } finally {
      setTestingWrite(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Bucket Test</Text>
      <Text style={styles.description}>
        This will test if the &lsquo;event-images&rsquo; storage bucket exists and is accessible for event images.
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
      
      <TouchableOpacity 
        style={[styles.button, styles.writeButton, testingWrite && styles.buttonDisabled]} 
        onPress={runWriteTest}
        disabled={testingWrite}
      >
        <Text style={styles.buttonText}>
          {testingWrite ? 'Testing Write...' : 'Test Storage Write'}
        </Text>
      </TouchableOpacity>
      
      {writeResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{writeResult}</Text>
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
  writeButton: {
    backgroundColor: '#059669',
    marginTop: 8,
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