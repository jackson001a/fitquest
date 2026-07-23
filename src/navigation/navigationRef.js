import { createNavigationContainerRef } from '@react-navigation/native';

// Ref compartilhado do NavigationContainer — permite navegar de fora da árvore
// de telas (ex: App.js pra deep links, ou o modal global de conquista) sem
// precisar do hook useNavigation(), que só funciona dentro de uma Screen.
export const navigationRef = createNavigationContainerRef();
