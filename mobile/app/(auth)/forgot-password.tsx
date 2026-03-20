// import { View, Text } from 'react-native'
// import React from 'react'

// const forgotpassword = () => {
//   return (
//     <View>
//       <Text>forgot-password</Text>
//     </View>
//   )
// }

// export default forgotpassword

// app/(auth)/forgot-password.tsx
// BUG FIX #9: Was a blank stub — <View><Text>forgot-password</Text></View>.
// Now a fully functional screen that calls the forgotPassword service.

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { forgotPassword } from "@/services/authService";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    if (!email.trim()) { setEmailError("Email is required."); return false; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError("Enter a valid email."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setApiError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      setApiError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark ? "bg-background-dark" : "bg-background-light";
  const textMain = isDark ? "text-text-main" : "text-slate-900";
  const textSub  = "text-text-sub";

  if (sent) {
    return (
      <View className={`flex-1 items-center justify-center px-6 ${bg}`}>
        <Text className="text-4xl mb-4">📬</Text>
        <Text className={`text-2xl font-bold text-center mb-2 ${textMain}`}>
          Check Your Email
        </Text>
        <Text className={`text-sm text-center leading-relaxed max-w-xs mb-8 ${textSub}`}>
          If an account exists for {email.trim().toLowerCase()}, we've sent a
          password reset link.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="bg-primary rounded-xl h-12 px-8 items-center justify-center"
        >
          <Text className="text-white font-bold text-base">Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className={`flex-1 ${bg}`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="mb-8" activeOpacity={0.7}>
          <Text className={`text-2xl ${textMain}`}>←</Text>
        </TouchableOpacity>

        {/* Hero */}
        <Text className={`text-[28px] font-bold tracking-tight mb-2 ${textMain}`}>
          Forgot Password?
        </Text>
        <Text className={`text-sm leading-relaxed mb-8 max-w-xs ${textSub}`}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {/* Error */}
        {apiError ? (
          <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-500 text-[13px] font-medium">⚠️ {apiError}</Text>
          </View>
        ) : null}

        {/* Email input */}
        <Text className={`text-sm font-medium mb-1.5 ml-0.5 ${textSub}`}>Email Address</Text>
        <View
          className={`flex-row items-center h-[52px] rounded-xl border-[1.5px] px-3.5 mb-1
            ${isDark ? "bg-surface" : "bg-white"}
            ${emailError ? "border-red-500" : email ? "border-primary" : isDark ? "border-primary/20" : "border-slate-200"}`}
        >
          <TextInput
            className={`flex-1 text-[15px] h-full ${textMain}`}
            value={email}
            onChangeText={(v) => { setEmail(v); setEmailError(""); setApiError(""); }}
            placeholder="hello@example.com"
            placeholderTextColor={isDark ? "#9CA3AF" : "#94A3B8"}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>
        {emailError ? (
          <Text className="text-red-500 text-xs mt-1 ml-1 mb-4">{emailError}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`bg-primary h-[52px] rounded-[14px] items-center justify-center ${loading ? "opacity-80" : "opacity-100"}`}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text className="text-white text-base font-bold tracking-wide">Send Reset Link</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}