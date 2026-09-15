import type * as React from 'react';
import type { StyleProp, ViewStyle, ScrollViewProps } from 'react-native';

declare module 'react-native' {
  interface View extends React.Component<any, any> {}
  interface Text extends React.Component<any, any> {}
  interface TextInput extends React.Component<any, any> {}
  interface ActivityIndicator extends React.Component<any, any> {}
  interface TouchableOpacity extends React.Component<any, any> {}
  interface Modal extends React.Component<any, any> {}
  interface Switch extends React.Component<any, any> {}
  interface Image extends React.Component<any, any> {}
  interface KeyboardAvoidingView extends React.Component<any, any> {}
  interface SafeAreaView extends React.Component<any, any> {}
  interface Pressable extends React.Component<any, any> {}
  interface StatusBar extends React.Component<any, any> {}
  interface RefreshControl extends React.Component<any, any> {}
  interface ScrollView extends React.Component<ScrollViewProps, any> {}
  interface FlatListProps<ItemT> {
    contentContainerStyle?: StyleProp<ViewStyle> | undefined;
  }
}

declare module 'invariant';
declare module 'expo-asset';
declare module '@react-native/assets-registry/registry';



