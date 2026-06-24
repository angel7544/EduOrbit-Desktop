import React from 'react';

// expo-file-system
export const getInfoAsync = async () => ({ exists: false, isDirectory: false, size: 0 });
export const readDirectoryAsync = async () => [];
export const deleteAsync = async () => {};
export const documentDirectory = '';

// expo-status-bar
export const StatusBar = () => null;

// expo-blur
export const BlurView = ({ children, style }: any) => <div style={{ ...style, backdropFilter: 'blur(10px)' }}>{children}</div>;

// expo-network
export const Network = { getNetworkStateAsync: async () => ({ isConnected: true }) };

// expo-secure-store
export const SecureStore = { getItemAsync: async () => null, setItemAsync: async () => null, deleteItemAsync: async () => null };

// expo-linking
export const Linking = { openURL: async (url: string) => window.open(url, '_blank') };

// expo-notifications
export const Notifications = { setNotificationHandler: () => null, requestPermissionsAsync: async () => ({ status: 'granted' }) };

// react-native-svg
export const Svg = ({ children, ...props }: any) => <svg {...props}>{children}</svg>;
export const Path = (props: any) => <path {...props} />;
export const Circle = (props: any) => <circle {...props} />;
export const Rect = (props: any) => <rect {...props} />;
export const G = (props: any) => <g {...props} />;

// expo-linear-gradient
export const LinearGradient = ({ colors, style, children }: any) => (
  <div style={{ ...style, background: `linear-gradient(to right, ${colors.join(', ')})` }}>
    {children}
  </div>
);

// crypto-js
export const Crypto = {};

// react-native-reanimated
export const useSharedValue = (initialValue: any) => ({ value: initialValue });
export const useAnimatedStyle = (updater: any) => ({});
export const withTiming = (toValue: any, config?: any) => toValue;
export const withRepeat = (animation: any, numberOfReps?: number, reverse?: boolean) => animation;
export const withSequence = (...animations: any[]) => animations[0];
export const withDelay = (delayMs: number, animation: any) => animation;
export const Reanimated = { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay };

// react-native-safe-area-context
export const SafeAreaView = ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>;
export const SafeAreaProvider = ({ children }: any) => <>{children}</>;
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });


// @react-navigation/native
export const useFocusEffect = (effect: any) => {
  React.useEffect(() => {
    return effect();
  }, [effect]);
};
export const useRoute = () => ({ params: {} });
export const useNavigation = () => ({ navigate: () => {}, goBack: () => {} });

// expo-video
export const useVideoPlayer = () => ({
  play: () => {},
  pause: () => {},
  replace: () => {},
  seekBy: () => {},
  replay: () => {},
});
export const VideoView = (props: any) => <div {...props}>Video Player Mock</div>;

// react-native-webview
export const WebView = (props: any) => <iframe {...props} title="WebView Mock" />;

// react-native-youtube-iframe
export const YoutubePlayer = (props: any) => <div {...props}>YouTube Player Mock</div>;

// react-native-markdown-display
export const Markdown = (props: any) => <div {...props}>{props.children}</div>;

// @react-native-async-storage/async-storage
export const AsyncStorage = {
  getItem: async () => null,
  setItem: async () => null,
  removeItem: async () => null,
  clear: async () => null,
};

export default {
  ...Reanimated,
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
  YoutubePlayer,
  Markdown,
  AsyncStorage
};
