// import { View, Text } from 'react-native'
// import React from 'react'

// const resetpassword = () => {
//   return (
//     <View>
//       <Text>reset-password</Text>
//     </View>
//   )
// }

// export default resetpassword

// app/(auth)/reset-password.tsx
// BUG FIX #9: Was a blank stub — <View><Text>reset-password</Text></View>.
// Reads the reset token from URL params (deep-linked from the email) and
// calls the resetPassword service.

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
import { useLocalSearchParams, useRouter } from "expo-router";
import { resetPassword } from "@/services/authService";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  // Token arrives via deep link: myapp://reset-password?token=xxx
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(false);
  const [apiError, setApiError]         = useState("");
  const [done, setDone]                 = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!confirm) errs.confirm = "Please confirm your password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";
    return errs;
  };

  const handleSubmit = async () => {
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!token) { setApiError("Invalid or missing reset token."); return; }

    setLoading(true);
    try {
      await resetPassword(token, { password });
      setDone(true);
    } catch (err: any) {
      setApiError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const bg       = isDark ? "bg-background-dark" : "bg-background-light";
  const textMain = isDark ? "text-text-main" : "text-slate-900";
  const textSub  = "text-text-sub";

  if (done) {
    return (
      <View className={`flex-1 items-center justify-center px-6 ${bg}`}>
        <Text className="text-4xl mb-4">🔐</Text>
        <Text className={`text-2xl font-bold text-center mb-2 ${textMain}`}>
          Password Reset!
        </Text>
        <Text className={`text-sm text-center leading-relaxed max-w-xs mb-8 ${textSub}`}>
          Your password has been updated. You can now log in with your new password.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="bg-primary rounded-xl h-12 px-8 items-center justify-center"
        >
          <Text className="text-white font-bold text-base">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fieldClass = (err: string, val: string) =>
    `flex-row items-center h-[52px] rounded-xl border-[1.5px] px-3.5
     ${isDark ? "bg-surface" : "bg-white"}
     ${err ? "border-red-500" : val ? "border-primary" : isDark ? "border-primary/20" : "border-slate-200"}`;

  return (
    <KeyboardAvoidingView
      className={`flex-1 ${bg}`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <Text className={`text-[28px] font-bold tracking-tight mb-2 ${textMain}`}>
          Set New Password
        </Text>
        <Text className={`text-sm leading-relaxed mb-8 max-w-xs ${textSub}`}>
          Choose a strong password you haven't used before.
        </Text>

        {/* API error */}
        {apiError ? (
          <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-500 text-[13px] font-medium">⚠️ {apiError}</Text>
          </View>
        ) : null}

        {/* New password */}
        <Text className={`text-sm font-medium mb-1.5 ml-0.5 ${textSub}`}>New Password</Text>
        <View className={fieldClass(errors.password ?? "", password)}>
          <TextInput
            className={`flex-1 text-[15px] h-full ${textMain}`}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: "" })); }}
            placeholder="Min. 8 characters"
            placeholderTextColor={isDark ? "#9CA3AF" : "#94A3B8"}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPass((s) => !s)} className="pl-2 py-1">
            <Text className={`${textSub} text-xs font-semibold tracking-widest`}>
              {showPass ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text className="text-red-500 text-xs mt-1 ml-1 mb-4">{errors.password}</Text>
        ) : <View className="mb-4" />}

        {/* Confirm password */}
        <Text className={`text-sm font-medium mb-1.5 ml-0.5 ${textSub}`}>Confirm Password</Text>
        <View className={fieldClass(errors.confirm ?? "", confirm)}>
          <TextInput
            className={`flex-1 text-[15px] h-full ${textMain}`}
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: "" })); }}
            placeholder="Repeat your password"
            placeholderTextColor={isDark ? "#9CA3AF" : "#94A3B8"}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} className="pl-2 py-1">
            <Text className={`${textSub} text-xs font-semibold tracking-widest`}>
              {showConfirm ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.confirm ? (
          <Text className="text-red-500 text-xs mt-1 ml-1 mb-6">{errors.confirm}</Text>
        ) : <View className="mb-6" />}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`bg-primary h-[52px] rounded-[14px] items-center justify-center ${loading ? "opacity-80" : "opacity-100"}`}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text className="text-white text-base font-bold tracking-wide">Reset Password</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}