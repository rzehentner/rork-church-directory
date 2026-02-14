import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  Clock,
  MapPin,
  Tag as TagIcon,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { useToast } from '@/hooks/toast-context';
import { useChurchSettings } from '@/hooks/church-settings-context';
import { listUpcomingEvents } from '@/services/events';
import { listPrayers, type PrayerRequest } from '@/services/prayer';
import { listTags, type Tag } from '@/services/tags';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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
  const [churchName, setChurchName] = useState('');
  const [bulletinDate, setBulletinDate] = useState(format(new Date(), 'MMMM d, yyyy'));
  const [includePrayers, setIncludePrayers] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeAnnouncements, setIncludeAnnouncements] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['schedule', 'custom']));
  const [initialized, setInitialized] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [excludedTagIds, setExcludedTagIds] = useState<Set<string>>(new Set());
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (!initialized && churchSettings) {
      if (churchSettings.churchName) {
        setChurchName(churchSettings.churchName);
      }
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
    const name = churchName || 'Our Church';
    const dateStr = bulletinDate || format(new Date(), 'MMMM d, yyyy');

    let prayerListHTML = '';
    if (includePrayers && prayers.length > 0) {
      const prayerItems = prayers
        .map((p: PrayerRequest) => `<li>${p.subject}${p.details ? ` — <span class="prayer-detail">${p.details}</span>` : ''}</li>`)
        .join('\n');
      prayerListHTML = `
        <div class="section prayer-section">
          <h2>Prayer List</h2>
          <ul class="prayer-list">${prayerItems}</ul>
        </div>`;
    }

    let eventsHTML = '';
    if (includeEvents && filteredEvents.length > 0) {
      const eventItems = filteredEvents.map((e: any) => {
        const startDate = new Date(e.start_at);
        const dateFormatted = format(startDate, 'EEEE, MMMM d');
        const timeFormatted = e.is_all_day ? 'All Day' : format(startDate, 'h:mm a');
        return `
          <div class="event-item">
            <div class="event-date">${dateFormatted}</div>
            <div class="event-details">
              <strong>${e.title}</strong>
              <span class="event-time">${timeFormatted}</span>
              ${e.location ? `<span class="event-location">${e.location}</span>` : ''}
              ${e.description ? `<p class="event-desc">${e.description}</p>` : ''}
            </div>
          </div>`;
      }).join('\n');
      eventsHTML = `
        <div class="section events-section">
          <h2>Upcoming Events</h2>
          ${eventItems}
        </div>`;
    }

    let announcementsHTML = '';
    if (includeAnnouncements && announcements.length > 0) {
      const announcementItems = announcements.map((a: any) => `
        <div class="announcement-item">
          <h3>${a.title}</h3>
          ${a.body ? `<p>${a.body}</p>` : ''}
        </div>`).join('\n');
      announcementsHTML = `
        <div class="section announcements-section">
          <h2>Announcements</h2>
          ${announcementItems}
        </div>`;
    }

    let scheduleHTML = '';
    if (scheduleItems.length > 0) {
      const grouped: Record<string, { time: string; activity: string }[]> = {};
      scheduleItems.forEach(item => {
        if (!item.day && !item.activity) return;
        const day = item.day || 'Other';
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push({ time: item.time, activity: item.activity });
      });

      if (Object.keys(grouped).length > 0) {
        const scheduleRows = Object.entries(grouped).map(([day, items]) => {
          const itemRows = items.map(i => `
            <tr>
              <td class="schedule-time">${i.time}</td>
              <td class="schedule-activity">${i.activity}</td>
            </tr>`).join('');
          return `
            <tr class="schedule-day-row">
              <td colspan="2" class="schedule-day">${day}</td>
            </tr>
            ${itemRows}`;
        }).join('');

        scheduleHTML = `
          <div class="section schedule-section">
            <h2>Weekly Schedule</h2>
            <table class="schedule-table">
              ${scheduleRows}
            </table>
          </div>`;
      }
    }

    let customHTML = '';
    const enabledCustom = customSections.filter(s => s.enabled && (s.title || s.content));
    if (enabledCustom.length > 0) {
      customHTML = enabledCustom.map(s => `
        <div class="section custom-section">
          ${s.title ? `<h2>${s.title}</h2>` : ''}
          <div class="custom-content">${s.content.replace(/\n/g, '<br/>')}</div>
        </div>`).join('\n');
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.4;
      background: #fff;
    }
    .bulletin-container {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0;
      min-height: 100vh;
    }
    .column {
      flex: 1;
      min-width: 48%;
      padding: 0.3in;
    }
    .column-left {
      border-right: 1px solid #c8c8c8;
    }
    .bulletin-header {
      text-align: center;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 2px solid #2c2c2c;
    }
    .bulletin-header h1 {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 4px;
      color: #1a1a1a;
    }
    .bulletin-header .date {
      font-size: 12pt;
      color: #555;
      font-style: italic;
    }
    .section {
      margin-bottom: 18px;
    }
    .section h2 {
      font-size: 13pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #999;
      padding-bottom: 4px;
      margin-bottom: 8px;
      color: #2c2c2c;
    }
    .prayer-list {
      list-style: none;
      padding: 0;
    }
    .prayer-list li {
      padding: 3px 0;
      padding-left: 14px;
      position: relative;
      font-size: 10.5pt;
    }
    .prayer-list li::before {
      content: "\\2022";
      position: absolute;
      left: 0;
      color: #666;
    }
    .prayer-detail {
      color: #555;
      font-style: italic;
      font-size: 9.5pt;
    }
    .event-item {
      margin-bottom: 10px;
      padding-left: 8px;
      border-left: 2px solid #999;
    }
    .event-date {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #555;
      letter-spacing: 0.5px;
    }
    .event-details strong {
      font-size: 11pt;
      display: block;
    }
    .event-time {
      font-size: 9.5pt;
      color: #666;
      margin-left: 4px;
    }
    .event-location {
      font-size: 9pt;
      color: #777;
      display: block;
      font-style: italic;
    }
    .event-desc {
      font-size: 9.5pt;
      color: #555;
      margin-top: 2px;
    }
    .announcement-item {
      margin-bottom: 10px;
    }
    .announcement-item h3 {
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .announcement-item p {
      font-size: 10pt;
      color: #444;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
    }
    .schedule-day-row td {
      padding-top: 8px;
    }
    .schedule-day {
      font-weight: 700;
      font-size: 11pt;
      color: #2c2c2c;
      border-bottom: 1px dotted #aaa;
      padding-bottom: 2px;
    }
    .schedule-time {
      width: 80px;
      font-size: 10pt;
      color: #555;
      padding: 2px 8px 2px 12px;
      vertical-align: top;
    }
    .schedule-activity {
      font-size: 10.5pt;
      padding: 2px 0;
    }
    .custom-content {
      font-size: 10.5pt;
      line-height: 1.5;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .bulletin-container { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="bulletin-header">
    <h1>${name}</h1>
    <div class="date">${dateStr}</div>
  </div>
  <div class="bulletin-container">
    <div class="column column-left">
      ${prayerListHTML}
      ${customHTML}
    </div>
    <div class="column column-right">
      ${scheduleHTML}
      ${eventsHTML}
      ${announcementsHTML}
    </div>
  </div>
</body>
</html>`;
  }, [churchName, bulletinDate, includePrayers, prayers, includeEvents, filteredEvents, includeAnnouncements, announcements, scheduleItems, customSections]);

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
        await Print.printAsync({ html });
      } catch (e) {
        console.log('Print preview cancelled or failed:', e);
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
        const { uri } = await Print.printToFileAsync({ html });
        console.log('PDF saved to:', uri);
        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        showSuccess('Bulletin PDF created');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
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
              <Text style={styles.cardLabel}>Church Name</Text>
              <TextInput
                style={styles.input}
                value={churchName}
                onChangeText={setChurchName}
                placeholder="Enter church name"
                placeholderTextColor="#9CA3AF"
              />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginTop: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1F2937',
  },
  toggleCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  sectionBody: {
    marginTop: 14,
  },
  filterModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterModeButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterModeButtonExcludeActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterModeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  filterModeTextActive: {
    color: '#FFFFFF',
  },
  filterHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tagChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  tagChipExcluded: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500' as const,
  },
  tagChipTextSelected: {
    color: '#1F2937',
    fontWeight: '600' as const,
  },
  tagCount: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 8,
    fontWeight: '500' as const,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  scheduleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
  },
  scheduleDay: {
    width: 80,
  },
  scheduleTime: {
    width: 80,
  },
  scheduleActivity: {
    flex: 1,
  },
  removeButton: {
    padding: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    gap: 6,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  customHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  customSectionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customTitleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    opacity: 0.5,
  },
  removeCustomButton: {
    padding: 6,
  },
  customContentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    gap: 8,
  },
  previewButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  downloadButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    gap: 8,
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
