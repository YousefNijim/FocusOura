import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Platform,
  BackHandler,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

if (!WEB_URL) {
  throw new Error(
    'EXPO_PUBLIC_WEB_URL is not set. ' +
    'Add it to your .env file before running the app.'
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const pendingPushToken = useRef<{ token: string; platform: string } | null>(null);
  const [webViewError, setWebViewError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Subscribe to network state — show offline screen when connection drops
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
      setIsOffline(!(state.isConnected ?? true));
    });
    return () => unsubscribe();
  }, []);

  // Intercept Android hardware back button to navigate WebView history
  // instead of exiting the app
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.error('Failed to get push token: permission not granted');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      sendPushTokenToWebApp(token);
    }
  }

  // Pass the Expo push token to the web app so it can register it with the backend.
  // The web app's window message handler must handle { type: 'PUSH_TOKEN', token, platform }
  // and call POST /api/notifications/token using its stored JWT.
  // On logout the web app should call DELETE /api/notifications/token directly.
  function sendPushTokenToWebApp(token: string) {
    const payload = JSON.stringify({ type: 'PUSH_TOKEN', token, platform: Platform.OS });
    if (webViewRef.current) {
      webViewRef.current.postMessage(payload);
    } else {
      pendingPushToken.current = { token, platform: Platform.OS };
    }
  }

  function handleWebViewLoad() {
    if (pendingPushToken.current) {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'PUSH_TOKEN', ...pendingPushToken.current })
      );
      pendingPushToken.current = null;
    }
  }

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'NOTIFY') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: data.title || 'FocusOura',
            body: data.body || 'Task update!',
          },
          trigger: null,
        });
      }
    } catch (e) {
      console.error('WebView Message Error:', e);
    }
  };

  if (isOffline) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centeredContainer}>
          <Text style={styles.errorTitle}>No Internet Connection</Text>
          <Text style={styles.errorMessage}>
            Please check your connection and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (webViewError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centeredContainer}>
          <Text style={styles.errorTitle}>Unable to Connect</Text>
          <Text style={styles.errorMessage}>
            Could not load Focusoura. Please check your internet connection.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setWebViewError(false)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: WEB_URL }}
          style={styles.webview}

          // Cookie support — required for any future cookie-based auth or session tokens
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}

          // Allow all origins for WebView navigation
          originWhitelist={['*']}

          // Prevent navigation away from our domain (except Google OAuth)
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;
            if (url.startsWith(WEB_URL!)) return true;
            if (url.startsWith('https://accounts.google.com')) return true;
            if (url.startsWith('https://oauth2.googleapis.com')) return true;
            if (url.startsWith('https://www.googleapis.com')) return true;
            if (url.includes('firebaseapp.com')) return true;
            if (url.includes('/__/auth/')) return true;
            if (url.startsWith('about:')) return true;
            return false;
          }}

          // Keep session state across navigations (never wipe localStorage)
          incognito={false}

          javaScriptEnabled={true}
          javaScriptCanOpenWindowsAutomatically={false}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          scalesPageToFit={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7F77DD" />
            </View>
          )}
          onLoad={handleWebViewLoad}
          onMessage={onMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
            setWebViewError(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 500) {
              setWebViewError(true);
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7F77DD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
