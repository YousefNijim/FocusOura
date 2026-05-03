
# FocusOura Project Documentation

## Overview
This document summarizes the implementation of the FocusOura project, a productivity application built with Flutter and Clean Architecture.

## Architecture
The project follows **Clean Architecture**, enforcing strict separation of concerns across three layers:

### 1. Domain Layer (`lib/domain`)
- **Entities**: Core business objects (`FocusSession`, `Subject`, `Plant`, `User`).
- **Repositories (Interfaces)**: Defines how data is accessed (`ISessionRepository`, `ISubjectRepository`, etc.).
- **Services (Interfaces)**: Defines external interactions (`IDeviceLockService`, `IAuthFacade`).
- **Independence**: This layer has NO dependencies on Flutter, Firebase, or other external libraries.

### 2. Application Layer (`lib/application`)
- **Use Cases**: Encapsulate business logic and orchestrate domain objects.
    - **Focus**: `StartFocusSessionUseCase`, `TrackFocusSessionUseCase`, `CompleteFocusSessionUseCase`.
    - **Auth**: `SignInUseCase`, `SignOutUseCase`, `GetCurrentUserUseCase`.

### 3. Infrastructure Layer (`lib/infrastructure`)
- **Repositories (Implementation)**: Concrete implementations using Firestore (`FirestoreSessionRepository`, etc.).
- **Auth**: `FirebaseAuthFacade` implementing `IAuthFacade`.
- **Mappers**: Convert between Domain Entities and Firestore Documents (`SessionMapper`, `SubjectMapper`).
- **Services (Implementation)**: Implementation of device services (`DeviceLockServiceImpl`).

### 4. Presentation Layer (`lib/presentation`)
- **Screens**: UI components.
    - `LoginScreen`: Authentication entry point.
    - `HomeScreen`: Dashboard for selecting subjects and starting sessions.
    - `FocusSessionScreen`: Active focus timer and controls.
- **Core**: `AuthWrapper` handles routing based on authentication state.
- **State Management**: Uses `Provider` for dependency injection and state handling.

## Files Created

### Core
- `pubspec.yaml`: Project dependencies (now includes `firebase_auth`).
- `lib/main.dart`: App entry point and Dependency Injection (DI) setup.

### Domain
- `lib/domain/auth/i_auth_facade.dart`: Auth Interface.
- `lib/domain/domain.dart`: (Original provided file, moved).
- `lib/domain/repositories/`: Interfaces.
- `lib/domain/services/`: Interfaces.

### Application
- `lib/application/auth/auth_use_cases.dart`: Sign In, Sign Out, Get User.
- `lib/application/usecases/`: Focus Session logic.

### Infrastructure
- `lib/infrastructure/auth/firebase_auth_facade.dart`: Firebase Auth implementation.
- `lib/infrastructure/repositories/`: Firestore implementations.
- `lib/infrastructure/mappers/`: Data mapping logic.
- `lib/infrastructure/services/device_lock_service_impl.dart`

### Presentation
- `lib/presentation/core/auth_wrapper.dart`: Auth state listener.
- `lib/presentation/screens/login_screen.dart`: Login UI.
- `lib/presentation/screens/home_screen.dart`: Main dashboard.
- `lib/presentation/screens/focus_session_screen.dart`: Focus timer.

## Next Steps
1.  **Firebase Configuration**: Run `flutterfire configure` to generate `firebase_options.dart`.
2.  **Enable Auth**: Go to Firebase Console -> Authentication -> Sign-in method -> Enable Email/Password.
3.  **Real Device Lock**: Implement Platform Channels in `DeviceLockServiceImpl` for specific Android/iOS APIs.
