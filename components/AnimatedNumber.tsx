import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  style,
  duration = 600,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(value);
  const [display, setDisplay] = React.useState(value.toFixed(decimals));

  useEffect(() => {
    const fromValue = displayRef.current;
    displayRef.current = value;

    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value: v }) => {
      const interpolated = fromValue + (value - fromValue) * v;
      setDisplay(interpolated.toFixed(decimals));
    });

    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  return (
    <Text style={style}>
      {prefix}{display}{suffix}
    </Text>
  );
}
