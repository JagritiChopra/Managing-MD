// app/(auth)/signup.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signupUser } from "@/services/authService";

type FormData = {
  name: string;
  email: string;
  password: string;
};

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors }, // BUG FIX #7a: errors was never destructured — validation
  } = useForm<FormData>({  //   failures showed no feedback to the user.
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (formData: FormData) => {
    try {
      setLoading(true);

      // BUG FIX #7b: Normalize email before sending to the API
      const normalizedEmail = formData.email.trim().toLowerCase();
      await signupUser({ ...formData, email: normalizedEmail });

      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: normalizedEmail },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="px-6 pt-16 pb-10">

        {/* HERO */}
        <View className="items-center mb-10">
          <Text className="text-3xl font-bold text-center text-slate-900 dark:text-text-main">
            Begin Your Journey
          </Text>
          <Text className="text-center text-text-sub mt-2 max-w-sm">
            Take the first step towards a calmer mind and a more balanced life.
          </Text>
        </View>

        {/* NAME */}
        <Text className="text-sm text-text-sub mb-2">Full Name</Text>
        <Controller
          control={control}
          name="name"
          rules={{ required: "Name is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-1">
                <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.name && (
                <Text className="text-red-500 text-xs mb-4 ml-1">
                  {errors.name.message}
                </Text>
              )}
              {!errors.name && <View className="mb-4" />}
            </>
          )}
        />

        {/* EMAIL */}
        <Text className="text-sm text-text-sub mb-2">Email</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
          }}
          render={({ field: { onChange, value } }) => (
            <>
              <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-1">
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="hello@example.com"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-xs mb-4 ml-1">
                  {errors.email.message}
                </Text>
              )}
              {!errors.email && <View className="mb-4" />}
            </>
          )}
        />

        {/* PASSWORD */}
        <Text className="text-sm text-text-sub mb-2">Create Password</Text>
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
          }}
          render={({ field: { onChange, value } }) => (
            <>
              <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-1">
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Min. 8 characters"
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={onChange}
                  className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-xs mb-4 ml-1">
                  {errors.password.message}
                </Text>
              )}
              {!errors.password && <View className="mb-4" />}
            </>
          )}
        />

        {/* TERMS */}
        <Text className="text-xs text-text-sub text-center mb-6">
          By signing up, you agree to our{" "}
          <Text className="text-primary">Terms of Service</Text> and{" "}
          <Text className="text-primary">Privacy Policy</Text>.
        </Text>

        {/* BUTTON
            BUG FIX #7c: The button previously rendered <Link href="/verify-email">
            inside itself when NOT loading. That Link fired immediately on tap,
            navigating to verify-email BEFORE the API call ran — even on a blank form.
            Now the button only calls handleSubmit; navigation happens inside onSubmit
            after a successful API response. */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          className="bg-primary rounded-xl h-14 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* LOGIN LINK */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-text-sub">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text className="text-primary font-semibold">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}



// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from "react-native";
// import { Link } from "expo-router";
// import { useState } from "react";
// import { Controller, useForm } from "react-hook-form";
// import { Ionicons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import { signupUser } from "@/services/authService";

// type FormData = {
//   name: string;
//   email: string;
//   password: string;
// };

// export default function Signup() {
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const { control, handleSubmit } = useForm<FormData>({
//     defaultValues: {
//       name: "",
//       email: "",
//       password: "",
//     },
//   });

//   const onSubmit = async (formData: FormData) => {
//     try {
//       setLoading(true);

//       await signupUser(formData);
//        router.replace({
//       pathname: "/verify-email",
//       params: { email: formData.email },
//     });
//       // Alert.alert("Success", "Account created successfully!");

//       // router.replace("/login");
//     } catch (err: any) {
//       Alert.alert("Error", err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView className="flex-1 bg-background-light dark:bg-background-dark">
//       <View className="px-6 pt-16 pb-10">

//         {/* HERO */}
//         <View className="items-center mb-10">
          

//           <Text className="text-3xl font-bold text-center text-slate-900 dark:text-text-main">
//             Begin Your Journey
//           </Text>

//           <Text className="text-center text-text-sub mt-2 max-w-sm">
//             Take the first step towards a calmer mind and a more balanced life.
//           </Text>
//         </View>

//         {/* NAME */}
//         <Text className="text-sm text-text-sub mb-2">Full Name</Text>

//         <Controller
//           control={control}
//           name="name"
//           rules={{ required: "Name is required" }}
//           render={({ field: { onChange, value } }) => (
//             <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-5">
//               <Ionicons name="person-outline" size={20} color="#9CA3AF" />

//               <TextInput
//                 placeholder="John Doe"
//                 value={value}
//                 onChangeText={onChange}
//                 className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
//                 placeholderTextColor="#9CA3AF"
//               />
//             </View>
//           )}
//         />

//         {/* EMAIL */}
//         <Text className="text-sm text-text-sub mb-2">Email</Text>

//         <Controller
//           control={control}
//           name="email"
//           rules={{ required: "Email is required" }}
//           render={({ field: { onChange, value } }) => (
//             <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-5">
//               <Ionicons name="mail-outline" size={20} color="#9CA3AF" />

//               <TextInput
//                 placeholder="hello@example.com"
//                 value={value}
//                 onChangeText={onChange}
//                 autoCapitalize="none"
//                 className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
//                 placeholderTextColor="#9CA3AF"
//               />
//             </View>
//           )}
//         />

//         {/* PASSWORD */}
//         <Text className="text-sm text-text-sub mb-2">Create Password</Text>

//         <Controller
//           control={control}
//           name="password"
//           rules={{
//             required: "Password required",
//             minLength: 8,
//           }}
//           render={({ field: { onChange, value } }) => (
//             <View className="flex-row items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-light rounded-xl px-4 h-14 mb-6">
//               <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />

//               <TextInput
//                 placeholder="Min. 8 characters"
//                 secureTextEntry={!showPassword}
//                 value={value}
//                 onChangeText={onChange}
//                 className="flex-1 ml-3 text-base text-slate-900 dark:text-text-main"
//                 placeholderTextColor="#9CA3AF"
//               />

//               <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//                 <Ionicons
//                   name={showPassword ? "eye-off-outline" : "eye-outline"}
//                   size={20}
//                   color="#9CA3AF"
//                 />
//               </TouchableOpacity>
//             </View>
//           )}
//         />

//         {/* TERMS */}
//         <Text className="text-xs text-text-sub text-center mb-6">
//           By signing up, you agree to our{" "}
//           <Text className="text-primary">Terms of Service</Text> and{" "}
//           <Text className="text-primary">Privacy Policy</Text>.
//         </Text>

//         {/* BUTTON */}
//         <TouchableOpacity
//           onPress={handleSubmit(onSubmit)}
//           disabled={loading}
//           className="bg-primary rounded-xl h-14 items-center justify-center"
//         >
//           {loading ? (
//             <ActivityIndicator color="white" />
//           ) : (
//             <Link href="/verify-email">
//                 <Text className="text-white font-bold text-base">
//                   Sign Up
//                 </Text>
//             </Link>
            
//           )}
//         </TouchableOpacity>

//         {/* LOGIN LINK */}
//         <View className="flex-row justify-center mt-8">
//           <Text className="text-text-sub">Already have an account? </Text>

//           <TouchableOpacity onPress={() => router.push("/login")}>
//             <Text className="text-primary font-semibold">Log In</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }