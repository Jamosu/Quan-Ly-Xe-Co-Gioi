import type * as React from 'react';
import type { ReactElement } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';

// React Native 0.86 ships class component declarations that TypeScript 6 does
// not currently recognise as JSX constructors. Keep this compatibility bridge
// local until the upstream declarations are aligned.
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
    contentContainerStyle?: StyleProp<ViewStyle>;
    refreshControl?: ReactElement;
    ListHeaderComponent?: React.ComponentType<any> | ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | ReactElement | null;
  }
}

declare module 'invariant';
