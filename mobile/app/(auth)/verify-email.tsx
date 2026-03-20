// app/(auth)/verify-email.tsx
// BUG FIX #8: This screen used a props-based API (onResend, onBack, onOpenEmail,
// email prop) — but Expo Router screens receive URL params, not component props.
// The email defaulted to "hello@example.com" and none of the callbacks worked.
// Fixed by reading params via useLocalSearchParams and wiring up all actions.

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
  ScrollView,
  ViewStyle,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { resendVerification } from "@/services/authService";

interface StepDotProps { active: boolean }
interface DecorativeBlobProps { style?: ViewStyle }
interface TipItem { icon: string; text: string }

const EnvelopeIcon: React.FC = () => (
  <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center">
    <View className="w-10 h-7 border-2 border-primary rounded-lg overflow-hidden items-center justify-center bg-primary/10">
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: 20, borderRightWidth: 20, borderTopWidth: 13,
          borderLeftColor: "transparent", borderRightColor: "transparent",
          borderTopColor: "#3B82F6",
          position: "absolute", top: 0,
        }}
      />
    </View>
    <View className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full items-center justify-center">
      <Text className="text-white text-xs font-bold">✓</Text>
    </View>
  </View>
);

const StepDot: React.FC<StepDotProps> = ({ active }) => (
  <View className={`rounded-full ${active ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-primary/30"}`} />
);

const DecorativeBlob: React.FC<DecorativeBlobProps> = ({ style }) => (
  <View className="absolute rounded-full bg-primary/10" style={[{ opacity: 0.5 }, style]} />
);

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const resolvedEmail = email ?? "your email";

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [resendLoading, setResendLoading] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleResend = async () => {
    if (!email) return;
    try {
      setResendLoading(true);
      await resendVerification({ email });
      Alert.alert("Sent!", "A new verification email has been sent.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOpenEmail = () => {
    Linking.openURL("mailto:").catch(() =>
      Alert.alert("No mail app found", "Please open your email app manually.")
    );
  };

  const tips: TipItem[] = [
    { icon: "📬", text: "Check your spam or junk folder too" },
    { icon: "⏱",  text: "The link expires in 24 hours" },
    { icon: "🔒", text: "Only one device can be verified at a time" },
  ];

  return (
    <View className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
      <DecorativeBlob style={{ width: 256, height: 256, top: -96, right: -96 }} />
      <DecorativeBlob style={{ width: 256, height: 256, top: "50%", left: -128 }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Nav */}
        <View className="flex-row items-center px-4 pt-4 pb-2 justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-12 h-12 rounded-full items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className={`text-2xl ${isDark ? "text-slate-100" : "text-slate-900"}`}>←</Text>
          </TouchableOpacity>

          <Text
            className={`text-lg font-bold tracking-tight flex-1 text-center pr-12 ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Verify Email
          </Text>
        </View>

        {/* Hero */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 24,
          }}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <EnvelopeIcon />
          </Animated.View>

          <Text
            className={`text-3xl font-bold tracking-tight text-center mt-6 mb-3 ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Check Your Inbox
          </Text>

          <Text
            className={`text-base text-center max-w-xs leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            We've sent a verification link to
          </Text>

          <View
            className={`mt-2 mb-2 px-4 py-2 rounded-full border ${
              isDark ? "bg-card-dark border-primary/20" : "bg-white border-slate-200"
            }`}
          >
            <Text className="text-primary font-semibold text-sm">{resolvedEmail}</Text>
          </View>

          <Text
            className={`text-base text-center max-w-xs leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Click the link in that email to activate your account.
          </Text>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingHorizontal: 24,
            maxWidth: 480,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {/* Info card */}
          <View
            className={`rounded-2xl border p-5 mb-6 ${
              isDark ? "bg-card-dark border-primary/20" : "bg-white border-slate-200"
            }`}
          >
            {tips.map((tip, i) => (
              <View
                key={i}
                className={`flex-row items-start gap-x-3 ${i < tips.length - 1 ? "mb-4" : ""}`}
              >
                <Text className="text-base mt-0.5">{tip.icon}</Text>
                <Text
                  className={`text-sm flex-1 leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Open email app */}
          <TouchableOpacity
            onPress={handleOpenEmail}
            className="w-full bg-primary rounded-xl py-4 items-center"
            style={{
              shadowColor: "#3B82F6",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
            activeOpacity={0.88}
          >
            <Text className="text-white font-bold text-base">Open Email App</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center py-6">
            <View className={`flex-1 border-t ${isDark ? "border-primary/10" : "border-slate-200"}`} />
            <Text className={`mx-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Didn't receive it?
            </Text>
            <View className={`flex-1 border-t ${isDark ? "border-primary/10" : "border-slate-200"}`} />
          </View>

          {/* Resend */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendLoading}
            className={`w-full border rounded-xl py-4 items-center ${
              isDark ? "border-primary/20 bg-card-dark" : "border-slate-200 bg-white"
            } ${resendLoading ? "opacity-60" : "opacity-100"}`}
            activeOpacity={0.75}
          >
            <Text
              className={`font-semibold text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              {resendLoading ? "Sending…" : "Resend Verification Email"}
            </Text>
          </TouchableOpacity>

          {/* Step dots */}
          <View className="flex-row items-center justify-center gap-x-2 mt-8 mb-4">
            <StepDot active={false} />
            <StepDot active={true} />
            <StepDot active={false} />
          </View>

          {/* Wrong email */}
          <View className="items-center pb-10">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Wrong email?{" "}
                <Text className="text-primary font-semibold">Go back & change it</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}



// import React, { useEffect, useRef } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Animated,
//   useColorScheme,
//   ScrollView,
//   ViewStyle,
// } from "react-native";

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface CheckEmailScreenProps {
//   email?: string;
//   onResend?: () => void;
//   onBack?: () => void;
//   onOpenEmail?: () => void;
// }

// interface StepDotProps {
//   active: boolean;
// }

// interface DecorativeBlobProps {
//   style?: ViewStyle;
// }

// interface TipItem {
//   icon: string;
//   text: string;
// }

// // ─── Envelope Icon ────────────────────────────────────────────────────────────
// const EnvelopeIcon: React.FC = () => (
//   <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center">
//     <View className="w-10 h-7 border-2 border-primary rounded-lg overflow-hidden items-center justify-center bg-primary/10">
//       <View
//         style={{
//           width: 0,
//           height: 0,
//           borderLeftWidth: 20,
//           borderRightWidth: 20,
//           borderTopWidth: 13,
//           borderLeftColor: "transparent",
//           borderRightColor: "transparent",
//           borderTopColor: "#3B82F6",
//           position: "absolute",
//           top: 0,
//         }}
//       />
//     </View>
//     <View className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full items-center justify-center">
//       <Text className="text-white text-xs font-bold">✓</Text>
//     </View>
//   </View>
// );

// // ─── Step Dot ─────────────────────────────────────────────────────────────────
// const StepDot: React.FC<StepDotProps> = ({ active }) => (
//   <View className={`rounded-full ${active ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-primary/30"}`} />
// );

// // ─── Decorative Blob ──────────────────────────────────────────────────────────
// const DecorativeBlob: React.FC<DecorativeBlobProps> = ({ style }) => (
//   <View
//     className="absolute rounded-full bg-primary/10"
//     style={[{ opacity: 0.5 }, style]}
//   />
// );

// // ─── Main Screen ──────────────────────────────────────────────────────────────
// const CheckEmailScreen: React.FC<CheckEmailScreenProps> = ({
//   email = "hello@example.com",
//   onResend,
//   onBack,
//   onOpenEmail,
// }) => {
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === "dark";

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(30)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 500,
//         useNativeDriver: true,
//       }),
//       Animated.spring(slideAnim, {
//         toValue: 0,
//         tension: 60,
//         friction: 10,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, {
//           toValue: 1.08,
//           duration: 1000,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseAnim, {
//           toValue: 1,
//           duration: 1000,
//           useNativeDriver: true,
//         }),
//       ])
//     ).start();
//   }, []);

//   const tips: TipItem[] = [
//     { icon: "📬", text: "Check your spam or junk folder too" },
//     { icon: "⏱", text: "The link expires in 24 hours" },
//     { icon: "🔒", text: "Only one device can be verified at a time" },
//   ];

//   return (
//     <View className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
//       <DecorativeBlob style={{ width: 256, height: 256, top: -96, right: -96 }} />
//       <DecorativeBlob style={{ width: 256, height: 256, top: "50%", left: -128 }} />

//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ flexGrow: 1 }}
//         showsVerticalScrollIndicator={false}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* Top Nav */}
//         <View className="flex-row items-center px-4 pt-4 pb-2 justify-between">
//           <TouchableOpacity
//             onPress={onBack}
//             className="w-12 h-12 rounded-full items-center justify-center"
//             activeOpacity={0.7}
//           >
//             <Text className={`text-2xl ${isDark ? "text-slate-100" : "text-slate-900"}`}>←</Text>
//           </TouchableOpacity>

//           <Text
//             className={`text-lg font-bold tracking-tight flex-1 text-center pr-12 ${
//               isDark ? "text-slate-100" : "text-slate-900"
//             }`}
//           >
//             Verify Email
//           </Text>
//         </View>

//         {/* Hero */}
//         <Animated.View
//           style={{
//             opacity: fadeAnim,
//             transform: [{ translateY: slideAnim }],
//             alignItems: "center",
//             paddingHorizontal: 24,
//             paddingTop: 40,
//             paddingBottom: 24,
//           }}
//         >
//           <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
//             <EnvelopeIcon />
//           </Animated.View>

//           <Text
//             className={`text-3xl font-bold tracking-tight text-center mt-6 mb-3 ${
//               isDark ? "text-slate-100" : "text-slate-900"
//             }`}
//           >
//             Check Your Inbox
//           </Text>

//           <Text
//             className={`text-base text-center max-w-xs leading-relaxed ${
//               isDark ? "text-slate-400" : "text-slate-600"
//             }`}
//           >
//             We've sent a verification link to
//           </Text>

//           <View
//             className={`mt-2 mb-2 px-4 py-2 rounded-full border ${
//               isDark ? "bg-card-dark border-primary/20" : "bg-white border-slate-200"
//             }`}
//           >
//             <Text className="text-primary font-semibold text-sm">{email}</Text>
//           </View>

//           <Text
//             className={`text-base text-center max-w-xs leading-relaxed ${
//               isDark ? "text-slate-400" : "text-slate-600"
//             }`}
//           >
//             Click the link in that email to activate your account.
//           </Text>
//         </Animated.View>

//         {/* Actions */}
//         <Animated.View
//           style={{
//             opacity: fadeAnim,
//             transform: [{ translateY: slideAnim }],
//             paddingHorizontal: 24,
//             maxWidth: 480,
//             width: "100%",
//             alignSelf: "center",
//           }}
//         >
//           {/* Info card */}
//           <View
//             className={`rounded-2xl border p-5 mb-6 ${
//               isDark ? "bg-card-dark border-primary/20" : "bg-white border-slate-200"
//             }`}
//           >
//             {tips.map((tip, i) => (
//               <View
//                 key={i}
//                 className={`flex-row items-start gap-x-3 ${i < tips.length - 1 ? "mb-4" : ""}`}
//               >
//                 <Text className="text-base mt-0.5">{tip.icon}</Text>
//                 <Text
//                   className={`text-sm flex-1 leading-relaxed ${
//                     isDark ? "text-slate-400" : "text-slate-600"
//                   }`}
//                 >
//                   {tip.text}
//                 </Text>
//               </View>
//             ))}
//           </View>

//           {/* Primary CTA */}
//           <TouchableOpacity
//             onPress={onOpenEmail}
//             className="w-full bg-primary rounded-xl py-4 items-center"
//             style={{
//               shadowColor: "#3B82F6",
//               shadowOpacity: 0.3,
//               shadowRadius: 12,
//               shadowOffset: { width: 0, height: 4 },
//               elevation: 6,
//             }}
//             activeOpacity={0.88}
//           >
//             <Text className="text-white font-bold text-base">Open Email App</Text>
//           </TouchableOpacity>

//           {/* Divider */}
//           <View className="flex-row items-center py-6">
//             <View className={`flex-1 border-t ${isDark ? "border-primary/10" : "border-slate-200"}`} />
//             <Text className={`mx-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
//               Didn't receive it?
//             </Text>
//             <View className={`flex-1 border-t ${isDark ? "border-primary/10" : "border-slate-200"}`} />
//           </View>

//           {/* Resend */}
//           <TouchableOpacity
//             onPress={onResend}
//             className={`w-full border rounded-xl py-4 items-center ${
//               isDark ? "border-primary/20 bg-card-dark" : "border-slate-200 bg-white"
//             }`}
//             activeOpacity={0.75}
//           >
//             <Text className={`font-semibold text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>
//               Resend Verification Email
//             </Text>
//           </TouchableOpacity>

//           {/* Step dots */}
//           <View className="flex-row items-center justify-center gap-x-2 mt-8 mb-4">
//             <StepDot active={false} />
//             <StepDot active={true} />
//             <StepDot active={false} />
//           </View>

//           {/* Wrong email */}
//           <View className="items-center pb-10">
//             <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
//               <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
//                 Wrong email?{" "}
//                 <Text className="text-primary font-semibold">Go back & change it</Text>
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </Animated.View>
//       </ScrollView>
//     </View>
//   );
// };

// export default CheckEmailScreen;