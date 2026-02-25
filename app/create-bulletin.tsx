import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  Heart,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  Clock,
  Tag as TagIcon,
} from 'lucide-react-native';
import { styles } from '@/styles/create-bulletin.styles';
import { useToast } from '@/hooks/toast-context';
import { useChurchSettings } from '@/hooks/church-settings-context';
import { listUpcomingEvents } from '@/services/events';
import { listPrayers } from '@/services/prayer';
import { listTags, type Tag } from '@/services/tags';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { generateBulletinHTML } from '@/utils/bulletin-html';

interface BulletinSection {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
}

interface ScheduleItem {
  day: string;
  time: string;
  activity: string;
}

export default function CreateBulletinScreen() {
  const { showSuccess, showError } = useToast();
  const { settings: churchSettings } = useChurchSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulletinDate, setBulletinDate] = useState(format(new Date(), 'MMMM d, yyyy'));
  const [includePrayers, setIncludePrayers] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeAnnouncements, setIncludeAnnouncements] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['schedule', 'custom']));
  const [initialized, setInitialized] = useState(false);

  const churchName = churchSettings?.churchName || 'Our Church';
  const churchAddress = churchSettings ? [churchSettings.address, churchSettings.city, churchSettings.state, churchSettings.zip].filter(Boolean).join(', ') : '';
  const churchPhone = churchSettings?.phone || '';
  const churchWebsite = churchSettings?.website || '';
  const pastorName = churchSettings?.pastorName || '';

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [excludedTagIds, setExcludedTagIds] = useState<Set<string>>(new Set());
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (!initialized && churchSettings) {
      if (churchSettings.serviceTimes && churchSettings.serviceTimes.length > 0) {
        setScheduleItems(churchSettings.serviceTimes.map(st => ({
          day: st.day,
          time: st.time,
          activity: st.activity,
        })));
      } else {
        setScheduleItems([
          { day: 'Sunday', time: '10:00 AM', activity: 'Sunday School' },
          { day: 'Sunday', time: '11:00 AM', activity: 'Worship Service' },
          { day: 'Wednesday', time: '6:00 PM', activity: 'Mid-Week Bible Study' },
        ]);
      }
      setInitialized(true);
    }
  }, [churchSettings, initialized]);

  const [customSections, setCustomSections] = useState<BulletinSection[]>([
    { id: '1', title: 'Nursery Schedule', content: '', enabled: true, order: 0 },
    { id: '2', title: 'Usher Schedule', content: '', enabled: true, order: 1 },
  ]);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['bulletin-events'],
    queryFn: () => listUpcomingEvents(20),
  });

  const { data: prayers = [], isLoading: prayersLoading } = useQuery({
    queryKey: ['bulletin-prayers'],
    queryFn: () => listPrayers('open', 50),
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['bulletin-tags'],
    queryFn: () => listTags(true),
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['bulletin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, is_published, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredEvents = useMemo(() => {
    if (selectedTagIds.size === 0 && excludedTagIds.size === 0) return events;
    return events.filter((event: any) => {
      const eventTags: string[] = event.audience_tags ?? [];
      if (excludedTagIds.size > 0) {
        const hasExcluded = eventTags.some((t: string) => excludedTagIds.has(t));
        if (hasExcluded) return false;
      }
      if (selectedTagIds.size > 0) {
        return eventTags.some((t: string) => selectedTagIds.has(t));
      }
      return true;
    });
  }, [events, selectedTagIds, excludedTagIds]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    if (tagFilterMode === 'include') {
      setSelectedTagIds(prev => {
        const next = new Set(prev);
        if (next.has(tagId)) next.delete(tagId);
        else next.add(tagId);
        return next;
      });
      setExcludedTagIds(prev => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
    } else {
      setExcludedTagIds(prev => {
        const next = new Set(prev);
        if (next.has(tagId)) next.delete(tagId);
        else next.add(tagId);
        return next;
      });
      setSelectedTagIds(prev => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
    }
  }, [tagFilterMode]);

  const addScheduleItem = useCallback(() => {
    setScheduleItems(prev => [...prev, { day: '', time: '', activity: '' }]);
  }, []);

  const removeScheduleItem = useCallback((index: number) => {
    setScheduleItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateScheduleItem = useCallback((index: number, field: keyof ScheduleItem, value: string) => {
    setScheduleItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const addCustomSection = useCallback(() => {
    const id = Date.now().toString();
    setCustomSections(prev => [...prev, { id, title: '', content: '', enabled: true, order: prev.length }]);
  }, []);

  const removeCustomSection = useCallback((id: string) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateCustomSection = useCallback((id: string, field: keyof BulletinSection, value: string | boolean) => {
    setCustomSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const generateHTML = useCallback(() => {
    return generateBulletinHTML({
      churchName,
      pastorName,
      churchAddress,
      churchPhone,
      churchWebsite,
      bulletinDate,
      includePrayers,
      includeEvents,
      includeAnnouncements,
      prayers,
      events: filteredEvents,
      announcements,
      scheduleItems,
      customSections,
    });
  }, [churchName, pastorName, churchAddress, churchPhone, churchWebsite, bulletinDate, includePrayers, prayers, includeEvents, filteredEvents, includeAnnouncements, announcements, scheduleItems, customSections]);

  const handlePreview = useCallback(async () => {
    const html = generateHTML();
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } else {
      try {
        const Print = await import('expo-print');
        await Print.printAsync({ html, width: 396, height: 612 });
      } catch {
        // print preview cancelled or failed; no action needed
      }
    }
  }, [generateHTML]);

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true);
    try {
      const html = generateHTML();

      if (Platform.OS === 'web') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 500);
        }
        showSuccess('Print dialog opened — save as PDF');
      } else {
        const Print = await import('expo-print');
        const { shareAsync } = await import('expo-sharing');
        const { uri } = await Print.printToFileAsync({ html, width: 396, height: 612 });
        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        showSuccess('Bulletin PDF created');
      }
    } catch {
      showError('Failed to generate bulletin PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [generateHTML, showSuccess, showError]);

  const isLoading = eventsLoading || prayersLoading || tagsLoading || announcementsLoading;

  const renderSectionHeader = (title: string, icon: React.ReactNode, sectionKey: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>
      {expandedSections.has(sectionKey) ? (
        <ChevronUp size={20} color="#6B7280" />
      ) : (
        <ChevronDown size={20} color="#6B7280" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Bulletin', headerBackTitle: 'Back' }} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading bulletin data...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.headerCard}>
              <FileText size={28} color="#7C3AED" />
              <Text style={styles.pageTitle}>Bulletin Builder</Text>
              <Text style={styles.pageSubtitle}>Configure and generate a print-ready bulletin</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.churchInfoRow}>
                <Text style={styles.churchInfoName}>{churchName}</Text>
                {churchAddress ? <Text style={styles.churchInfoDetail}>{churchAddress}</Text> : null}
                {churchPhone ? <Text style={styles.churchInfoDetail}>{churchPhone}</Text> : null}
                <Text style={styles.churchInfoHint}>Edit in Admin → Church Settings</Text>
              </View>
              <Text style={styles.cardLabel}>Bulletin Date</Text>
              <TextInput
                style={styles.input}
                value={bulletinDate}
                onChangeText={setBulletinDate}
                placeholder="e.g. February 16, 2026"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.card}>
              {renderSectionHeader('Tag Filters', <TagIcon size={18} color="#7C3AED" />, 'tags')}
              {expandedSections.has('tags') && (
                <View style={styles.sectionBody}>
                  <View style={styles.filterModeRow}>
                    <TouchableOpacity
                      style={[styles.filterModeButton, tagFilterMode === 'include' && styles.filterModeButtonActive]}
                      onPress={() => setTagFilterMode('include')}
                    >
                      <Text style={[styles.filterModeText, tagFilterMode === 'include' && styles.filterModeTextActive]}>Include</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterModeButton, tagFilterMode === 'exclude' && styles.filterModeButtonExcludeActive]}
                      onPress={() => setTagFilterMode('exclude')}
                    >
                      <Text style={[styles.filterModeText, tagFilterMode === 'exclude' && styles.filterModeTextActive]}>Exclude</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.filterHint}>
                    {tagFilterMode === 'include'
                      ? 'Select tags to include (empty = all)'
                      : 'Select tags to exclude from the bulletin'}
                  </Text>
                  <View style={styles.tagGrid}>
                    {tags.map((tag: Tag) => {
                      const isSelected = tagFilterMode === 'include' ? selectedTagIds.has(tag.id) : excludedTagIds.has(tag.id);
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            styles.tagChip,
                            isSelected && (tagFilterMode === 'include' ? styles.tagChipSelected : styles.tagChipExcluded),
                          ]}
                          onPress={() => toggleTag(tag.id)}
                        >
                          <View style={[styles.tagDot, { backgroundColor: tag.color || '#6B7280' }]} />
                          <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                            {tag.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedTagIds.size > 0 && (
                    <Text style={styles.tagCount}>{selectedTagIds.size} tag(s) included</Text>
                  )}
                  {excludedTagIds.size > 0 && (
                    <Text style={[styles.tagCount, { color: '#EF4444' }]}>{excludedTagIds.size} tag(s) excluded</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Content Sections</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Heart size={16} color="#EF4444" />
                  <Text style={styles.toggleLabel}>Prayer List</Text>
                  <Text style={styles.toggleCount}>({prayers.length})</Text>
                </View>
                <Switch
                  value={includePrayers}
                  onValueChange={setIncludePrayers}
                  trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Calendar size={16} color="#3B82F6" />
                  <Text style={styles.toggleLabel}>Upcoming Events</Text>
                  <Text style={styles.toggleCount}>({filteredEvents.length})</Text>
                </View>
                <Switch
                  value={includeEvents}
                  onValueChange={setIncludeEvents}
                  trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <FileText size={16} color="#F59E0B" />
                  <Text style={styles.toggleLabel}>Announcements</Text>
                  <Text style={styles.toggleCount}>({announcements.length})</Text>
                </View>
                <Switch
                  value={includeAnnouncements}
                  onValueChange={setIncludeAnnouncements}
                  trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.card}>
              {renderSectionHeader('Weekly Schedule', <Clock size={18} color="#3B82F6" />, 'schedule')}
              {expandedSections.has('schedule') && (
                <View style={styles.sectionBody}>
                  {scheduleItems.map((item, index) => (
                    <View key={index} style={styles.scheduleRow}>
                      <TextInput
                        style={[styles.scheduleInput, styles.scheduleDay]}
                        value={item.day}
                        onChangeText={(v) => updateScheduleItem(index, 'day', v)}
                        placeholder="Day"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.scheduleInput, styles.scheduleTime]}
                        value={item.time}
                        onChangeText={(v) => updateScheduleItem(index, 'time', v)}
                        placeholder="Time"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.scheduleInput, styles.scheduleActivity]}
                        value={item.activity}
                        onChangeText={(v) => updateScheduleItem(index, 'activity', v)}
                        placeholder="Activity"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeScheduleItem(index)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addButton} onPress={addScheduleItem}>
                    <Plus size={16} color="#7C3AED" />
                    <Text style={styles.addButtonText}>Add Schedule Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.card}>
              {renderSectionHeader('Custom Sections', <FileText size={18} color="#10B981" />, 'custom')}
              {expandedSections.has('custom') && (
                <View style={styles.sectionBody}>
                  <Text style={styles.customHint}>
                    Add nursery schedule, usher list, or any other content
                  </Text>
                  {customSections.map((section) => (
                    <View key={section.id} style={styles.customSectionCard}>
                      <View style={styles.customSectionHeader}>
                        <Switch
                          value={section.enabled}
                          onValueChange={(v) => updateCustomSection(section.id, 'enabled', v)}
                          trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                          thumbColor="#FFFFFF"
                        />
                        <TextInput
                          style={[styles.customTitleInput, !section.enabled && styles.disabledInput]}
                          value={section.title}
                          onChangeText={(v) => updateCustomSection(section.id, 'title', v)}
                          placeholder="Section Title"
                          placeholderTextColor="#9CA3AF"
                          editable={section.enabled}
                        />
                        <TouchableOpacity
                          style={styles.removeCustomButton}
                          onPress={() => removeCustomSection(section.id)}
                        >
                          <X size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      {section.enabled && (
                        <TextInput
                          style={styles.customContentInput}
                          value={section.content}
                          onChangeText={(v) => updateCustomSection(section.id, 'content', v)}
                          placeholder="Enter content (e.g. names, schedule, notes...)"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          numberOfLines={4}
                        />
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addButton} onPress={addCustomSection}>
                    <Plus size={16} color="#7C3AED" />
                    <Text style={styles.addButtonText}>Add Custom Section</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={handlePreview}
              activeOpacity={0.7}
            >
              <Eye size={18} color="#7C3AED" />
              <Text style={styles.previewButtonText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadButton, isGenerating && styles.downloadButtonDisabled]}
              onPress={handleDownloadPDF}
              activeOpacity={0.7}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size={18} color="#FFFFFF" />
              ) : (
                <Download size={18} color="#FFFFFF" />
              )}
              <Text style={styles.downloadButtonText}>
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
