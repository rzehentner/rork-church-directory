import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Globe, Heart, Code, Smartphone, ChevronRight, ExternalLink } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function DeveloperInfoScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: Colors.white,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />

      <LinearGradient
        colors={[Colors.navyDark, Colors.navy, Colors.navyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
          <View style={[styles.patternCircle, styles.patternCircle3]} />
        </View>

        <Animated.View
          style={[
            styles.heroContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/ebc-logo-stacked-white.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroVersion}>Version 1.0.0</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.missionCard}>
            <View style={styles.missionIconWrap}>
              <Heart size={20} color={Colors.gold} />
            </View>
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              EBC Connect was built to strengthen the bonds of our church family at Edna Baptist Church. 
              Staying connected, informed, and engaged has never been easier.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>The Team</Text>

          <View style={styles.teamCard}>
            <View style={styles.teamMemberRow}>
              <View style={styles.avatarWrap}>
                <Code size={22} color={Colors.white} />
              </View>
              <View style={styles.teamMemberInfo}>
                <Text style={styles.teamMemberName}>Caleb McWhorter</Text>
                <Text style={styles.teamMemberRole}>Lead Developer</Text>
              </View>
            </View>
            <View style={styles.teamDivider} />
            <Text style={styles.teamBio}>
              Designed and developed EBC Connect with a passion for serving the church community through technology.
            </Text>
            <View style={styles.contactLinks}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => openLink('mailto:caleb@ednabc.org')}
                testID="developer-email-link"
              >
                <Mail size={16} color={Colors.navy} />
                <Text style={styles.contactButtonText}>caleb@ednabc.org</Text>
                <ExternalLink size={12} color={Colors.steelBlue} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Technology</Text>

          <View style={styles.techCard}>
            <View style={styles.techRow}>
              <View style={[styles.techBadge, { backgroundColor: '#EBF4FF' }]}>
                <Smartphone size={16} color={Colors.navyLight} />
              </View>
              <View style={styles.techInfo}>
                <Text style={styles.techLabel}>Platform</Text>
                <Text style={styles.techValue}>React Native with Expo</Text>
              </View>
            </View>
            <View style={styles.techDivider} />
            <View style={styles.techRow}>
              <View style={[styles.techBadge, { backgroundColor: '#FFF8EB' }]}>
                <Globe size={16} color={Colors.gold} />
              </View>
              <View style={styles.techInfo}>
                <Text style={styles.techLabel}>Availability</Text>
                <Text style={styles.techValue}>iOS, Android & Web</Text>
              </View>
            </View>
          </View>

          <View style={styles.churchCard}>
            <Image
              source={require('@/assets/images/ebc-icon-mark-color.png')}
              style={styles.churchLogo}
              resizeMode="contain"
            />
            <Text style={styles.churchName}>Edna Baptist Church</Text>
            <Text style={styles.churchTagline}>Connecting our church family</Text>
            <View style={styles.goldAccent} />
          </View>

          <Text style={styles.footerText}>
            Made with love for the EBC family
          </Text>

          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmWhite,
  },
  heroGradient: {
    paddingTop: 100,
    paddingBottom: 40,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  heroPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute' as const,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  patternCircle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -60,
  },
  patternCircle2: {
    width: 200,
    height: 200,
    bottom: -40,
    left: -50,
  },
  patternCircle3: {
    width: 140,
    height: 140,
    top: 30,
    left: 20,
    borderColor: 'rgba(212,168,67,0.12)',
  },
  heroContent: {
    alignItems: 'center' as const,
  },
  heroLogo: {
    width: 140,
    height: 140,
  },
  heroVersion: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  missionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  missionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,168,67,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    marginBottom: 10,
  },
  missionText: {
    fontSize: 14,
    color: Colors.steelBlue,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.steelBlue,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 12,
    marginLeft: 4,
  },
  teamCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  teamMemberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.navyDark,
  },
  teamMemberRole: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  teamDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 14,
  },
  teamBio: {
    fontSize: 14,
    color: Colors.steelBlue,
    lineHeight: 21,
  },
  contactLinks: {
    marginTop: 14,
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.cream,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.navy,
    flex: 1,
  },
  techCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  techRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    gap: 12,
  },
  techBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  techInfo: {
    flex: 1,
  },
  techLabel: {
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '500' as const,
  },
  techValue: {
    fontSize: 15,
    color: Colors.navyDark,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  techDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginHorizontal: 14,
  },
  churchCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 28,
    marginTop: 28,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  churchLogo: {
    width: 52,
    height: 52,
    marginBottom: 12,
  },
  churchName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    marginBottom: 4,
  },
  churchTagline: {
    fontSize: 13,
    color: Colors.steelBlue,
  },
  goldAccent: {
    width: 40,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center' as const,
    marginTop: 28,
  },
  bottomSpacing: {
    height: 40,
  },
});
