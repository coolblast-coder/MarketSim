import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Shadows } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import NeonButton from '../components/NeonButton';
import { saveUserProfile, setBalance } from '../services/storage';
import { supabase } from '../services/supabase';

const { width, height } = Dimensions.get('window');

// Floating particle for background animation
function Particle({ delay, size, x, duration }: {
  delay: number; size: number; x: number; duration: number;
}) {
  const translateY = useRef(new Animated.Value(height + 50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height + 50);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -50,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.neonCyan,
        opacity,
        transform: [{ translateY }],
        ...Shadows.neonCyan,
      }}
    />
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [balance, setBalanceInput] = useState('10000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!username.trim()) {
      setError('Enter a trader name');
      return;
    }

    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum) || balanceNum < 100) {
      setError('Minimum starting balance is $100');
      return;
    }
    if (balanceNum > 10000000) {
      setError('Maximum starting balance is $10,000,000');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // If Supabase has email confirmation disabled, session is available immediately
      if (data.session) {
        await saveUserProfile(username.trim());
        await setBalance(balanceNum);
        router.replace('/(tabs)');
      } else {
        // Email confirmation is enabled – tell user to check inbox
        setError('Check your email for a confirmation link, then sign in.');
        setLoading(false);
      }
    } catch (e) {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.replace('/(tabs)');
    } catch (e) {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  // Generate particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    key: i,
    delay: Math.random() * 4000,
    size: 3 + Math.random() * 4,
    x: Math.random() * width,
    duration: 8000 + Math.random() * 6000,
  }));

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, '#0d1235']}
      style={styles.container}
    >
      {/* Floating particles */}
      {particles.map(p => (
        <Particle key={p.key} {...p} />
      ))}

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Title */}
        <Animated.View style={[styles.titleArea, { opacity: titleOpacity }]}>
          <Text style={styles.logoIcon}>📈</Text>
          <Text style={styles.title}>MarketSim</Text>
          <Text style={styles.subtitle}>Day Trading Simulator</Text>
        </Animated.View>

        {/* Login Card */}
        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
            width: '100%',
            maxWidth: 420,
          }}
        >
          <GlassCard neonBorder style={styles.card}>
            <Text style={styles.cardTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.cardSub}>
              {isSignUp
                ? 'Sign up to start trading with virtual money'
                : 'Sign in to access your portfolio'}
            </Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            {/* Sign-up only fields */}
            {isSignUp && (
              <>
                {/* Username */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Trader Name</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. WolfOfWallSt"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    maxLength={20}
                  />
                </View>

                {/* Balance */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Starting Balance ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={balance}
                    onChangeText={setBalanceInput}
                    placeholder="10000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                  <View style={styles.presets}>
                    {['1000', '10000', '50000', '100000'].map(val => (
                      <Text
                        key={val}
                        style={[
                          styles.preset,
                          balance === val && styles.presetActive,
                        ]}
                        onPress={() => setBalanceInput(val)}
                      >
                        ${Number(val).toLocaleString()}
                      </Text>
                    ))}
                  </View>
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <NeonButton
              title={
                loading
                  ? 'Please wait...'
                  : isSignUp
                  ? '🚀 Create Account'
                  : '🔑 Sign In'
              }
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
              style={{ marginTop: Spacing.md }}
            />

            {/* Toggle sign-up / sign-in */}
            <Text
              style={styles.toggleText}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </GlassCard>
        </Animated.View>

        <Text style={styles.footer}>Trade stocks with virtual money • Zero risk</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.neonCyan,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bgInput,
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    overflow: 'hidden',
  },
  presetActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    color: Colors.neonCyan,
  },
  error: {
    color: Colors.negative,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  toggleText: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.neonCyan,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    marginTop: Spacing.xl,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
