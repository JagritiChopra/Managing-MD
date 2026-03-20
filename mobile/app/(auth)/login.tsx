// app/(auth)/login.tsx
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { loginUser } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

// Navigation after login is handled automatically by the root layout's
// useEffect — it watches token and redirects to /(tabs) when it's set.

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = ({ email, password }: { email: string; password: string }) => {
  const errs: Record<string, string> = {};
  if (!email.trim()) errs.email = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
    errs.email = "Enter a valid email.";
  if (!password) errs.password = "Password is required.";
  else if (password.length < 8)
    errs.password = "Password must be at least 8 characters.";
  return errs;
};

const parseApiError = (msg: string): string => {
  if (msg.toLowerCase().includes("verify"))
    return "Please verify your email before logging in.";
  if (msg.toLowerCase().includes("invalid"))
    return "Invalid email or password.";
  return msg;
};

// ─── InputField ───────────────────────────────────────────────────────────────
type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  error?: string;
  onToggleSecure?: () => void;
  showToggle?: boolean;
  showSecure?: boolean;
  dark: boolean;
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: "next" | "done";
};

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  error,
  onToggleSecure,
  showToggle,
  showSecure,
  dark,
  onSubmitEditing,
  inputRef,
  returnKeyType = "next",
}: InputFieldProps) => (
  <View className="mb-4">
    <Text className="text-text-sub text-sm font-medium mb-1.5 ml-0.5">
      {label}
    </Text>
    <View
      className={`flex-row items-center h-[52px] rounded-xl border-[1.5px] px-3.5
        ${dark ? "bg-surface" : "bg-white"}
        ${
          error
            ? "border-red-500"
            : value
            ? "border-primary"
            : dark
            ? "border-primary/20"
            : "border-slate-200"
        }`}
    >
      <TextInput
        ref={inputRef ?? null}
        className={`flex-1 text-[15px] h-full ${
          dark ? "text-text-main" : "text-slate-900"
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={dark ? "#9CA3AF" : "#94A3B8"}
        secureTextEntry={secureTextEntry && !showSecure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {showToggle && (
        <TouchableOpacity
          onPress={onToggleSecure}
          className="pl-2 py-1"
          activeOpacity={0.7}
        >
          <Text className="text-text-sub text-xs font-semibold tracking-widest">
            {showSecure ? "HIDE" : "SHOW"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
    {error ? (
      <Text className="text-red-500 text-xs mt-1.5 ml-1">{error}</Text>
    ) : null}
  </View>
);

// ─── LoginScreen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const dark = useColorScheme() === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const btnScale = useRef(new Animated.Value(1)).current;
  const passwordRef = useRef<TextInput | null>(null);

  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
    if (apiError) setApiError("");
  };

  const handleLogin = useCallback(async () => {
    setApiError("");
    const normalizedEmail = email.trim().toLowerCase();
    const errs = validate({ email: normalizedEmail, password });
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await loginUser({ email: normalizedEmail, password });
      const token = data.data?.token;

      if (!token) throw new Error("No token returned from server.");

      // signIn updates AuthContext → root layout's useEffect sees token change
      // and automatically navigates to /(tabs). No manual router.replace needed.
      await signIn(token);
    } catch (err: any) {
      setApiError(parseApiError(err.message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <View
      className={`flex-1 ${
        dark ? "bg-background-dark" : "bg-background-light"
      }`}
    >
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

      <View
        className="absolute -top-16 -right-16 w-52 h-52 rounded-full"
        style={{
          backgroundColor: dark
            ? "rgba(59,130,246,0.12)"
            : "rgba(59,130,246,0.08)",
          pointerEvents: "none",
        }}
      />
      <View
        className="absolute bottom-10 -left-20 w-56 h-56 rounded-full"
        style={{
          backgroundColor: dark
            ? "rgba(16,185,129,0.07)"
            : "rgba(16,185,129,0.05)",
          pointerEvents: "none",
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 64,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="items-center mb-9">
            <Text
              className={`text-[28px] font-bold tracking-tight text-center mb-2
              ${dark ? "text-text-main" : "text-slate-900"}`}
            >
              Welcome Back
            </Text>
            <Text className="text-text-sub text-sm text-center leading-relaxed max-w-[260px]">
              Log in to continue your journey towards a calmer mind.
            </Text>
          </View>

          {/* Card */}
          <View
            className={`rounded-2xl p-6 mb-5 ${
              dark ? "bg-surface" : "bg-white shadow-sm shadow-primary/10"
            }`}
          >
            {apiError ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-500 text-[13px] font-medium">
                  ⚠️ {apiError}
                </Text>
              </View>
            ) : null}

            <InputField
              label="Email Address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearError("email");
              }}
              placeholder="hello@example.com"
              keyboardType="email-address"
              error={errors.email}
              dark={dark}
              onSubmitEditing={() => passwordRef.current?.focus()}
              returnKeyType="next"
            />

            <InputField
              inputRef={passwordRef}
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearError("password");
              }}
              placeholder="Min. 8 characters"
              secureTextEntry
              showToggle
              showSecure={showPass}
              onToggleSecure={() => setShowPass((s) => !s)}
              error={errors.password}
              dark={dark}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            {/* BUG FIX #5: Was calling navigation?.navigate("ForgotPassword")
                which is old React Navigation API — doesn't work with Expo Router.
                Replaced with router.push to the correct file-based route. */}
            <TouchableOpacity
              className="self-end mb-5 -mt-1 py-1"
              onPress={() => router.push("/(auth)/forgot-password")}
              activeOpacity={0.7}
            >
              <Text className="text-primary text-[13px] font-semibold">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                className={`bg-primary h-[52px] rounded-[14px] items-center justify-center ${
                  loading ? "opacity-80" : "opacity-100"
                }`}
                onPress={handleLogin}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white text-base font-bold tracking-wide">
                    Log In
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Sign up link */}
          {/* BUG FIX #6: Previously had BOTH a TouchableOpacity onPress (navigation prop)
              AND a <Link> nested inside it — both fired on tap, causing double navigation.
              Replaced with a single router.push call. */}
          <View className="flex-row justify-center items-center pt-1">
            <Text className="text-text-sub text-sm">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup")}
              activeOpacity={0.7}
            >
              <Text className="text-primary text-sm font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}



// // app/(auth)/login.tsx
// import React, { useState, useRef, useCallback } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Animated,
//   StatusBar,
//   useColorScheme,
// } from "react-native";
// import { useRouter } from "expo-router";
// import { loginUser } from "@/services/authService";
// import { useAuth } from "@/context/AuthContext";

// // ─── Validation ───────────────────────────────────────────────────────────────
// const validate = ({ email, password }: { email: string; password: string }) => {
//   const errs: Record<string, string> = {};
//   if (!email.trim()) errs.email = "Email is required.";
//   else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
//     errs.email = "Enter a valid email.";
//   if (!password) errs.password = "Password is required.";
//   else if (password.length < 8)
//     errs.password = "Password must be at least 8 characters.";
//   return errs;
// };

// const parseApiError = (msg: string): string => {
//   if (msg.toLowerCase().includes("verify"))
//     return "Please verify your email before logging in.";
//   if (msg.toLowerCase().includes("invalid"))
//     return "Invalid email or password.";
//   return msg;
// };

// // ─── InputField ───────────────────────────────────────────────────────────────
// type InputFieldProps = {
//   label: string;
//   value: string;
//   onChangeText: (v: string) => void;
//   placeholder: string;
//   secureTextEntry?: boolean;
//   keyboardType?: "default" | "email-address";
//   error?: string;
//   onToggleSecure?: () => void;
//   showToggle?: boolean;
//   showSecure?: boolean;
//   dark: boolean;
//   onSubmitEditing?: () => void;
//   inputRef?: React.RefObject<TextInput | null>;
//   returnKeyType?: "next" | "done";
// };

// const InputField = ({
//   label,
//   value,
//   onChangeText,
//   placeholder,
//   secureTextEntry,
//   keyboardType = "default",
//   error,
//   onToggleSecure,
//   showToggle,
//   showSecure,
//   dark,
//   onSubmitEditing,
//   inputRef,
//   returnKeyType = "next",
// }: InputFieldProps) => (
//   <View className="mb-4">
//     <Text className="text-text-sub text-sm font-medium mb-1.5 ml-0.5">
//       {label}
//     </Text>
//     <View
//       className={`flex-row items-center h-[52px] rounded-xl border-[1.5px] px-3.5
//         ${dark ? "bg-surface" : "bg-white"}
//         ${
//           error
//             ? "border-red-500"
//             : value
//             ? "border-primary"
//             : dark
//             ? "border-primary/20"
//             : "border-slate-200"
//         }`}
//     >
//       <TextInput
//         ref={inputRef ?? null}
//         className={`flex-1 text-[15px] h-full ${
//           dark ? "text-text-main" : "text-slate-900"
//         }`}
//         value={value}
//         onChangeText={onChangeText}
//         placeholder={placeholder}
//         placeholderTextColor={dark ? "#9CA3AF" : "#94A3B8"}
//         secureTextEntry={secureTextEntry && !showSecure}
//         keyboardType={keyboardType}
//         autoCapitalize="none"
//         autoCorrect={false}
//         onSubmitEditing={onSubmitEditing}
//         returnKeyType={returnKeyType}
//       />
//       {showToggle && (
//         <TouchableOpacity
//           onPress={onToggleSecure}
//           className="pl-2 py-1"
//           activeOpacity={0.7}
//         >
//           <Text className="text-text-sub text-xs font-semibold tracking-widest">
//             {showSecure ? "HIDE" : "SHOW"}
//           </Text>
//         </TouchableOpacity>
//       )}
//     </View>
//     {error ? (
//       <Text className="text-red-500 text-xs mt-1.5 ml-1">{error}</Text>
//     ) : null}
//   </View>
// );

// // ─── LoginScreen ──────────────────────────────────────────────────────────────
// export default function LoginScreen() {
//   const router = useRouter();
//   const { signIn } = useAuth();
//   const dark = useColorScheme() === "dark";

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPass, setShowPass] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(false);
//   const [apiError, setApiError] = useState("");

//   const btnScale = useRef(new Animated.Value(1)).current;
//   const passwordRef = useRef<TextInput | null>(null);

//   const pressIn = () =>
//     Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
//   const pressOut = () =>
//     Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

//   const clearError = (field: string) => {
//     if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
//     if (apiError) setApiError("");
//   };

//   const handleLogin = useCallback(async () => {
//     setApiError("");
//     const normalizedEmail = email.trim().toLowerCase();
//     const errs = validate({ email: normalizedEmail, password });
//     if (Object.keys(errs).length) {
//       setErrors(errs);
//       return;
//     }
//     setErrors({});
//     setLoading(true);
//     try {
//       const data = await loginUser({ email: normalizedEmail, password });
//       const token = data.data?.token;

//       // Persist token via AuthContext so root layout re-renders automatically
//       if (token) await signIn(token);

//       router.replace("/(tabs)");
//     } catch (err: any) {
//       setApiError(parseApiError(err.message || "Something went wrong."));
//     } finally {
//       setLoading(false);
//     }
//   }, [email, password, signIn]);

//   return (
//     <View
//       className={`flex-1 ${
//         dark ? "bg-background-dark" : "bg-background-light"
//       }`}
//     >
//       <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

//       <View
//         className="absolute -top-16 -right-16 w-52 h-52 rounded-full"
//         style={{
//           backgroundColor: dark
//             ? "rgba(59,130,246,0.12)"
//             : "rgba(59,130,246,0.08)",
//           pointerEvents: "none",
//         }}
//       />
//       <View
//         className="absolute bottom-10 -left-20 w-56 h-56 rounded-full"
//         style={{
//           backgroundColor: dark
//             ? "rgba(16,185,129,0.07)"
//             : "rgba(16,185,129,0.05)",
//           pointerEvents: "none",
//         }}
//       />

//       <KeyboardAvoidingView
//         className="flex-1"
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
//       >
//         <ScrollView
//           contentContainerStyle={{
//             flexGrow: 1,
//             paddingHorizontal: 24,
//             paddingTop: 64,
//             paddingBottom: 40,
//           }}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Hero */}
//           <View className="items-center mb-9">
//             <Text
//               className={`text-[28px] font-bold tracking-tight text-center mb-2
//               ${dark ? "text-text-main" : "text-slate-900"}`}
//             >
//               Welcome Back
//             </Text>
//             <Text className="text-text-sub text-sm text-center leading-relaxed max-w-[260px]">
//               Log in to continue your journey towards a calmer mind.
//             </Text>
//           </View>

//           {/* Card */}
//           <View
//             className={`rounded-2xl p-6 mb-5 ${
//               dark ? "bg-surface" : "bg-white shadow-sm shadow-primary/10"
//             }`}
//           >
//             {apiError ? (
//               <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
//                 <Text className="text-red-500 text-[13px] font-medium">
//                   ⚠️ {apiError}
//                 </Text>
//               </View>
//             ) : null}

//             <InputField
//               label="Email Address"
//               value={email}
//               onChangeText={(v) => {
//                 setEmail(v);
//                 clearError("email");
//               }}
//               placeholder="hello@example.com"
//               keyboardType="email-address"
//               error={errors.email}
//               dark={dark}
//               onSubmitEditing={() => passwordRef.current?.focus()}
//               returnKeyType="next"
//             />

//             <InputField
//               inputRef={passwordRef}
//               label="Password"
//               value={password}
//               onChangeText={(v) => {
//                 setPassword(v);
//                 clearError("password");
//               }}
//               placeholder="Min. 8 characters"
//               secureTextEntry
//               showToggle
//               showSecure={showPass}
//               onToggleSecure={() => setShowPass((s) => !s)}
//               error={errors.password}
//               dark={dark}
//               onSubmitEditing={handleLogin}
//               returnKeyType="done"
//             />

//             {/* BUG FIX #5: Was calling navigation?.navigate("ForgotPassword")
//                 which is old React Navigation API — doesn't work with Expo Router.
//                 Replaced with router.push to the correct file-based route. */}
//             <TouchableOpacity
//               className="self-end mb-5 -mt-1 py-1"
//               onPress={() => router.push("/(auth)/forgot-password")}
//               activeOpacity={0.7}
//             >
//               <Text className="text-primary text-[13px] font-semibold">
//                 Forgot Password?
//               </Text>
//             </TouchableOpacity>

//             <Animated.View style={{ transform: [{ scale: btnScale }] }}>
//               <TouchableOpacity
//                 className={`bg-primary h-[52px] rounded-[14px] items-center justify-center ${
//                   loading ? "opacity-80" : "opacity-100"
//                 }`}
//                 onPress={handleLogin}
//                 onPressIn={pressIn}
//                 onPressOut={pressOut}
//                 activeOpacity={1}
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text className="text-white text-base font-bold tracking-wide">
//                     Log In
//                   </Text>
//                 )}
//               </TouchableOpacity>
//             </Animated.View>
//           </View>

//           {/* Sign up link */}
//           {/* BUG FIX #6: Previously had BOTH a TouchableOpacity onPress (navigation prop)
//               AND a <Link> nested inside it — both fired on tap, causing double navigation.
//               Replaced with a single router.push call. */}
//           <View className="flex-row justify-center items-center pt-1">
//             <Text className="text-text-sub text-sm">
//               Don't have an account?{" "}
//             </Text>
//             <TouchableOpacity
//               onPress={() => router.push("/(auth)/signup")}
//               activeOpacity={0.7}
//             >
//               <Text className="text-primary text-sm font-bold">Sign Up</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }



// // import React, { useState, useRef, useCallback } from "react";
// // import {
// //   View,
// //   Text,
// //   TextInput,
// //   TouchableOpacity,
// //   ScrollView,
// //   KeyboardAvoidingView,
// //   Platform,
// //   ActivityIndicator,
// //   Animated,
// //   StatusBar,
// //   useColorScheme,
// //   Alert,
// // } from "react-native";
// // import { useRouter } from "expo-router";
// // import { loginUser } from "@/services/authService";
// // import * as SecureStore from "expo-secure-store"; // FIX #8: token persistence
// // import { Link } from "expo-router";

// // // ─── Validation ───────────────────────────────────────────────────────────────
// // const validate = ({ email, password }: { email: string; password: string }) => {
// //   const errs: Record<string, string> = {};
// //   if (!email.trim()) errs.email = "Email is required.";
// //   else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email.";
// //   if (!password) errs.password = "Password is required.";
// //   else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
// //   return errs;
// // };

// // // ─── Parse API error to a user-friendly message ───────────────────────────────
// // const parseApiError = (msg: string): string => {
// //   if (msg.toLowerCase().includes("verify"))
// //     return "Please verify your email before logging in.";
// //   if (msg.toLowerCase().includes("invalid"))
// //     return "Invalid email or password.";
// //   return msg;
// // };

// // // ─── InputField ───────────────────────────────────────────────────────────────
// // type InputFieldProps = {
// //   label: string;
// //   value: string;
// //   onChangeText: (v: string) => void;
// //   placeholder: string;
// //   secureTextEntry?: boolean;
// //   keyboardType?: "default" | "email-address";
// //   error?: string;
// //   onToggleSecure?: () => void;
// //   showToggle?: boolean;
// //   showSecure?: boolean;
// //   dark: boolean;
// //   onSubmitEditing?: () => void;
// //   inputRef?: React.RefObject<TextInput | null>; // FIX #5: allow null in ref type
// //   returnKeyType?: "next" | "done";
// // };

// // const InputField = ({
// //   label,
// //   value,
// //   onChangeText,
// //   placeholder,
// //   secureTextEntry,
// //   keyboardType = "default",
// //   error,
// //   onToggleSecure,
// //   showToggle,
// //   showSecure,
// //   dark,
// //   onSubmitEditing,
// //   inputRef,
// //   returnKeyType = "next",
// // }: InputFieldProps) => (
// //   <View className="mb-4">
// //     <Text className="text-text-sub text-sm font-medium mb-1.5 ml-0.5">{label}</Text>
// //     <View
// //       className={`flex-row items-center h-[52px] rounded-xl border-[1.5px] px-3.5
// //         ${dark ? "bg-surface" : "bg-white"}
// //         ${error ? "border-red-500" : value ? "border-primary" : dark ? "border-primary/20" : "border-slate-200"}`}
// //     >
// //       <TextInput
// //         ref={inputRef ?? null}
// //         className={`flex-1 text-[15px] h-full ${dark ? "text-text-main" : "text-slate-900"}`}
// //         value={value}
// //         onChangeText={onChangeText}
// //         placeholder={placeholder}
// //         placeholderTextColor={dark ? "#9CA3AF" : "#94A3B8"}
// //         secureTextEntry={secureTextEntry && !showSecure}
// //         keyboardType={keyboardType}
// //         autoCapitalize="none"
// //         autoCorrect={false}
// //         onSubmitEditing={onSubmitEditing}
// //         returnKeyType={returnKeyType}
// //       />
// //       {showToggle && (
// //         <TouchableOpacity onPress={onToggleSecure} className="pl-2 py-1" activeOpacity={0.7}>
// //           <Text className="text-text-sub text-xs font-semibold tracking-widest">
// //             {showSecure ? "HIDE" : "SHOW"}
// //           </Text>
// //         </TouchableOpacity>
// //       )}
// //     </View>
// //     {error ? <Text className="text-red-500 text-xs mt-1.5 ml-1">{error}</Text> : null}
// //   </View>
// // );

// // // ─── SocialButton ─────────────────────────────────────────────────────────────
// // const SocialButton = ({ label, icon, dark }: { label: string; icon: string; dark: boolean }) => (
// //   <TouchableOpacity
// //     className={`flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl border-[1.5px]
// //       ${dark ? "border-primary/20 bg-surface-light" : "border-slate-200 bg-slate-50"}`}
// //     activeOpacity={0.75}
// //   >
// //     <Text className={`text-[15px] font-bold ${dark ? "text-text-main" : "text-slate-800"}`}>
// //       {icon}
// //     </Text>
// //     <Text className={`text-sm font-medium ${dark ? "text-text-main" : "text-slate-800"}`}>
// //       {label}
// //     </Text>
// //   </TouchableOpacity>
// // );

// // // ─── LoginScreen ──────────────────────────────────────────────────────────────
// // const LoginScreen = ({ navigation }: { navigation?: any }) => {
// //   const router = useRouter();
// //   const dark = useColorScheme() === "dark";

// //   const [email, setEmail]       = useState("");
// //   const [password, setPassword] = useState("");
// //   const [showPass, setShowPass] = useState(false);
// //   const [errors, setErrors]     = useState<Record<string, string>>({});
// //   const [loading, setLoading]   = useState(false);
// //   const [apiError, setApiError] = useState("");

// //   const btnScale    = useRef(new Animated.Value(1)).current;
// //   const passwordRef = useRef<TextInput | null>(null); // FIX #5: explicit null init

// //   const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
// //   const pressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

// //   const clearError = (field: string) => {
// //     if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
// //     if (apiError) setApiError("");
// //   };

// //   // FIX #4: complete dependency array
// //   const handleLogin = useCallback(async () => {
// //     setApiError("");
// //     const normalizedEmail = email.trim().toLowerCase(); // FIX #9: normalize early
// //     const errs = validate({ email: normalizedEmail, password });
// //     if (Object.keys(errs).length) { setErrors(errs); return; }
// //     setErrors({});
// //     setLoading(true);
// //     try {
// //       const data = await loginUser({ email: normalizedEmail, password });
// //       const token = data.data?.token;
// //       const user  = data.data?.user;

// //       // FIX #8: persist token securely
// //       if (token) {
// //         await SecureStore.setItemAsync("auth_token", token);
// //       }

// //       router.replace("/(tabs)");

// //       // FIX #3: actually navigate after successful login
// //   //     if (navigation) {
// //   //      router.replace("../index");
// //   //     } else {
// //   //       Alert.alert("Welcome back!", `Logged in as ${user?.name ?? normalizedEmail}`); // FIX #9: use normalizedEmail
// //   //     }
// //     } catch (err: any) {
// //       setApiError(parseApiError(err.message || "Something went wrong."));
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [email, password, navigation]); // FIX #4: navigation added to deps

// //   return (
// //     <View className={`flex-1 ${dark ? "bg-background-dark" : "bg-background-light"}`}>
// //       <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

// //       {/* FIX #7: pointerEvents moved into style prop (deprecated as JSX prop in RN 0.71+) */}
// //       <View
// //         className="absolute -top-16 -right-16 w-52 h-52 rounded-full"
// //         style={{
// //           backgroundColor: dark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)",
// //           pointerEvents: "none",
// //         }}
// //       />
// //       <View
// //         className="absolute bottom-10 -left-20 w-56 h-56 rounded-full"
// //         style={{
// //           backgroundColor: dark ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.05)",
// //           pointerEvents: "none",
// //         }}
// //       />

// //       <KeyboardAvoidingView
// //         className="flex-1"
// //         behavior={Platform.OS === "ios" ? "padding" : "height"}
// //         keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
// //       >
// //         {/* FIX #6: contentContainerStyle instead of contentContainerClassName (not valid RN prop) */}
// //         <ScrollView
// //           contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
// //           keyboardShouldPersistTaps="handled"
// //           showsVerticalScrollIndicator={false}
// //         >
// //           {/* Hero */}
// //           <View className="items-center mb-9">
           
// //             <Text className={`text-[28px] font-bold tracking-tight text-center mb-2
// //               ${dark ? "text-text-main" : "text-slate-900"}`}
// //             >
// //               Welcome Back
// //             </Text>
// //             <Text className="text-text-sub text-sm text-center leading-relaxed max-w-[260px]">
// //               Log in to continue your journey towards a calmer mind.
// //             </Text>
// //           </View>

// //           {/* Card */}
// //           <View className={`rounded-2xl p-6 mb-5 ${dark ? "bg-surface" : "bg-white shadow-sm shadow-primary/10"}`}>
// //             {apiError ? (
// //               <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
// //                 <Text className="text-red-500 text-[13px] font-medium">⚠️  {apiError}</Text>
// //               </View>
// //             ) : null}

// //             <InputField
// //               label="Email Address"
// //               value={email}
// //               onChangeText={(v) => { setEmail(v); clearError("email"); }}
// //               placeholder="hello@example.com"
// //               keyboardType="email-address"
// //               error={errors.email}
// //               dark={dark}
// //               onSubmitEditing={() => passwordRef.current?.focus()}
// //               returnKeyType="next"
// //             />

// //             <InputField
// //               inputRef={passwordRef}
// //               label="Password"
// //               value={password}
// //               onChangeText={(v) => { setPassword(v); clearError("password"); }}
// //               placeholder="Min. 8 characters"
// //               secureTextEntry
// //               showToggle
// //               showSecure={showPass}
// //               onToggleSecure={() => setShowPass((s) => !s)}
// //               error={errors.password}
// //               dark={dark}
// //               onSubmitEditing={handleLogin}
// //               returnKeyType="done"
// //             />

// //             {/* FIX #2: navigate to ForgotPassword screen (forgotPassword service call
// //                 belongs inside that dedicated screen, not here — removed unused import) */}
// //             <TouchableOpacity
// //               className="self-end mb-5 -mt-1 py-1"
// //               onPress={() => navigation?.navigate("ForgotPassword")}
// //               activeOpacity={0.7}
// //             >
// //               <Text className="text-primary text-[13px] font-semibold">Forgot Password?</Text>
// //             </TouchableOpacity>

// //             <Animated.View style={{ transform: [{ scale: btnScale }] }}>
// //               <TouchableOpacity
// //                 className={`bg-primary h-[52px] rounded-[14px] items-center justify-center ${loading ? "opacity-80" : "opacity-100"}`}
// //                 onPress={handleLogin}
// //                 onPressIn={pressIn}
// //                 onPressOut={pressOut}
// //                 activeOpacity={1}
// //                 disabled={loading}
// //               >
// //                 {loading
// //                   ? <ActivityIndicator color="#fff" size="small" />
// //                   : <Text className="text-white text-base font-bold tracking-wide">Log In</Text>
// //                 }
// //               </TouchableOpacity>
// //             </Animated.View>

           

           
// //           </View>

// //           {/* Sign up link */}
// //           <View className="flex-row justify-center items-center pt-1">
// //             <Text className="text-text-sub text-sm">Don't have an account? </Text>
// //             <TouchableOpacity onPress={() => navigation?.navigate("Signup")} activeOpacity={0.7}>
// //               <Link href="/signup" >
// //               <Text className="text-primary text-sm font-bold">Sign Up</Text>
// //                 </Link>
// //             </TouchableOpacity>
// //           </View>
// //         </ScrollView>
// //       </KeyboardAvoidingView>
// //     </View>
// //   );
// // };

// // export default LoginScreen;