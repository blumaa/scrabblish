import { createBrowserRouter } from 'react-router';
import { AuthLayout } from './components/layouts/AuthLayout';
import { LoginRoute } from './components/layouts/LoginRoute';
import { HomeScreen } from './components/screens/HomeScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { NewGameScreen } from './components/screens/NewGameScreen';
import { OnlineGameScreen } from './components/game/OnlineGameScreen';
import { GameScreen } from './components/game/GameScreen';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginRoute,
  },
  {
    path: '/local',
    Component: GameScreen,
  },
  {
    Component: AuthLayout,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'profile', Component: ProfileScreen },
      { path: 'stats', Component: StatsScreen },
      { path: 'game/new/:friendId', Component: NewGameScreen },
      { path: 'game/:id', Component: OnlineGameScreen },
    ],
  },
]);
