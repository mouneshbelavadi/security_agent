// Note: Kannada translations must be reviewed by a native speaker before launch.

export type Language = "en" | "kn";

export interface Translations {
  // App Shell & Navigation
  gateSecurity: string;
  visitorIntake: string;
  signOut: string;
  language: string;
  authorisedUseOnly: string;
  adminConsole: string;
  visitorLog: string;
  employees: string;
  guards: string;

  // Guard Home
  newVisitor: string;
  newVisitorCheckIn: string;
  todaysVisitors: string;
  visitorsWaitingApproval: string;
  noVisitorsWaiting: string;
  noVisitorsWaitingDesc: string;

  // Step 1: Visitor Details
  step1Of3: string;
  step2Of3: string;
  step3Of3: string;
  visitorDetailsTitle: string;
  visitorDetailsDesc: string;
  visitorName: string;
  visitorNamePlaceholder: string;
  visitorEmail: string;
  visitorEmailPlaceholder: string;
  visitorPhone: string;
  visitorPhonePlaceholder: string;
  idTypeLabel: string;
  purpose: string;
  purposePlaceholder: string;
  nextStep: string;
  backStep: string;

  // Step 2: Host Selection
  whoInvitedTitle: string;
  whoInvitedDesc: string;
  searchEmployeePlaceholder: string;
  noEmployeesFound: string;

  // Step 3: Photos & Review
  idPhotoTitle: string;
  idPhotoDesc: string;
  idMethodPhoto: string;
  idMethodNumber: string;
  idNumberLabel: string;
  idNumberPlaceholder: string;
  takePhotoId: string;
  takeVisitorPhoto: string;
  idPhotoAttached: string;
  visitorPhotoAttached: string;
  retake: string;
  reviewSummary: string;
  sendRequest: string;
  sendingRequest: string;

  // Request Status Screen
  waitingHost: string;
  waitingApprovalFrom: string;
  askOtp: string;
  approvedAskOtp: string;
  entryDenied: string;
  deniedByHost: string;
  requestExpired: string;
  allowEntry: string;
  codeMatchedAllow: string;
  requestExpiresIn: string;
  enter6DigitOtp: string;
  verifyCode: string;
  wrongCodeAttemptsLeft: string;
  attemptsRemaining: string;
  requestLocked3Attempts: string;
  visitorLeft: string;
  recordingExit: string;
  startNewRequest: string;

  // Today's visitors
  todaysVisitorsTitle: string;
  todaysVisitorsDesc: string;
  noVisitorsToday: string;
  exitRecorded: string;
  backToHome: string;

  // Errors & Validations
  enterNameError: string;
  enterEmailError: string;
  enterPhoneError: string;
  selectHostError: string;
  selectIdTypeError: string;
  uploadPhotoError: string;
  completeOtpError: string;
  emailCouldNotBeSent: string;
  retrySendingEmail: string;
  retryingEmail: string;
  emailSentSuccess: string;
  callHostDirectly: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    gateSecurity: "Gate Security",
    visitorIntake: "Visitor Intake",
    signOut: "Sign Out",
    language: "Language",
    authorisedUseOnly: "For authorised security use only.",
    adminConsole: "Admin Console",
    visitorLog: "Visitor Log",
    employees: "Employees",
    guards: "Guards",

    newVisitor: "New Visitor",
    newVisitorCheckIn: "New Visitor Check-In",
    todaysVisitors: "Today's Visitors",
    visitorsWaitingApproval: "Visitors Waiting for Approval",
    noVisitorsWaiting: "No visitors waiting.",
    noVisitorsWaitingDesc: "When a new visitor request is sent to a host, it will appear here.",

    step1Of3: "Step 1 of 3: Visitor Details",
    step2Of3: "Step 2 of 3: Employee Host",
    step3Of3: "Step 3 of 3: ID Photo & Send",
    visitorDetailsTitle: "Visitor Details",
    visitorDetailsDesc: "Enter the visitor contact information.",
    visitorName: "Full Name",
    visitorNamePlaceholder: "e.g. Ramesh Sharma",
    visitorEmail: "Email Address",
    visitorEmailPlaceholder: "e.g. ramesh@example.com",
    visitorPhone: "Mobile Number (10 digits)",
    visitorPhonePlaceholder: "9876543210",
    idTypeLabel: "Government ID Type",
    purpose: "Purpose of Visit (Optional)",
    purposePlaceholder: "e.g. Interview, Delivery, Meeting",
    nextStep: "Next",
    backStep: "Back",

    whoInvitedTitle: "Who Invited the Visitor?",
    whoInvitedDesc: "Type the employee name or department to find them.",
    searchEmployeePlaceholder: "Search employee name or department...",
    noEmployeesFound: "No matching employees found.",

    idPhotoTitle: "ID Verification & Confirmation",
    idPhotoDesc: "Select ID type and provide either a photo or the ID number.",
    idMethodPhoto: "Upload / Take ID Photo",
    idMethodNumber: "Enter ID Number",
    idNumberLabel: "Government ID / Aadhaar Number",
    idNumberPlaceholder: "Enter ID number (e.g. Aadhaar / PAN / DL)",
    takePhotoId: "Take photo of ID card",
    takeVisitorPhoto: "Take visitor photo (Optional)",
    idPhotoAttached: "ID photo attached",
    visitorPhotoAttached: "Visitor photo attached",
    retake: "Retake",
    reviewSummary: "Summary Before Sending",
    sendRequest: "Send Request to Host",
    sendingRequest: "Sending Request...",

    waitingHost: "Waiting for Host Approval",
    waitingApprovalFrom: "Waiting for approval from",
    askOtp: "Ask Visitor for 6-Digit OTP",
    approvedAskOtp: "Host approved this visitor. Ask the visitor for the 6-digit code sent to their email.",
    entryDenied: "ENTRY DENIED",
    deniedByHost: "Entry denied by host. Do not allow entry.",
    requestExpired: "Request expired. Please start a new request.",
    allowEntry: "Accepted. Please send the visitor in.",
    codeMatchedAllow: "Accepted. Please send the visitor in.",
    requestExpiresIn: "The request expires in",
    enter6DigitOtp: "Enter 6-digit code from visitor",
    verifyCode: "Verify Code",
    wrongCodeAttemptsLeft: "Wrong code.",
    attemptsRemaining: "attempt(s) remaining",
    requestLocked3Attempts: "Request locked. 3 incorrect attempts. Please start a new request.",
    visitorLeft: "Visitor Left",
    recordingExit: "Recording Exit...",
    startNewRequest: "Check-In Next Visitor",

    todaysVisitorsTitle: "Today's Visitors",
    todaysVisitorsDesc: "All visitors checked in today at the gate.",
    noVisitorsToday: "No visitors checked in today.",
    exitRecorded: "Exit recorded",
    backToHome: "Back to Home",

    enterNameError: "Please enter the visitor name.",
    enterEmailError: "Please enter a valid visitor email address.",
    enterPhoneError: "Please enter a valid 10-digit Indian mobile number.",
    selectHostError: "Please select an employee host.",
    selectIdTypeError: "Please select a valid ID type.",
    uploadPhotoError: "Please take or upload an ID card photo.",
    completeOtpError: "Please enter the complete 6-digit code.",
    emailCouldNotBeSent: "Email could not be sent. Please call the host.",
    retrySendingEmail: "Retry sending email",
    retryingEmail: "Sending...",
    emailSentSuccess: "Email sent to host successfully.",
    callHostDirectly: "Please contact host directly.",
  },

  kn: {
    gateSecurity: "ಗೇಟ್ ಭದ್ರತೆ",
    visitorIntake: "ಸಂದರ್ಶಕರ ನೋಂದಣಿ",
    signOut: "ಲಾಗ್ ಔಟ್",
    language: "ಭಾಷೆ",
    authorisedUseOnly: "ಅಧಿಕೃತ ಭದ್ರತಾ ಬಳಕೆಗೆ ಮಾತ್ರ.",
    adminConsole: "ಆಡಳಿತ ಮಂಡಳಿ",
    visitorLog: "ಸಂದರ್ಶಕರ ದಾಖಲೆ",
    employees: "ಉದ್ಯೋಗಿಗಳು",
    guards: "ಭದ್ರತಾ ಸಿಬ್ಬಂದಿ",

    newVisitor: "ಹೊಸ ಸಂದರ್ಶಕರು",
    newVisitorCheckIn: "ಹೊಸ ಸಂದರ್ಶಕರ ತಪಾಸಣೆ",
    todaysVisitors: "ಇಂದಿನ ಸಂದರ್ಶಕರು",
    visitorsWaitingApproval: "ಅನುಮೋದನೆಗಾಗಿ ಕಾಯುತ್ತಿರುವ ಸಂದರ್ಶಕರು",
    noVisitorsWaiting: "ಯಾವುದೇ ಸಂದರ್ಶಕರು ಕಾಯುತ್ತಿಲ್ಲ.",
    noVisitorsWaitingDesc: "ಹೊಸ ಪರಿಶೀಲನಾ ವಿನಂತಿ ಕಳುಹಿಸಿದಾಗ ಅದು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",

    step1Of3: "ಹಂತ 1 / 3: ಸಂದರ್ಶಕರ ವಿವರ",
    step2Of3: "ಹಂತ 2 / 3: ಆತಿಥೇಯ ಉದ್ಯೋಗಿ",
    step3Of3: "ಹಂತ 3 / 3: ಗುರುತಿನ ಚೀಟಿ ಮತ್ತು ರವಾನೆ",
    visitorDetailsTitle: "ಸಂದರ್ಶಕರ ವಿವರ",
    visitorDetailsDesc: "ಸಂದರ್ಶಕರ ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.",
    visitorName: "ಪೂರ್ಣ ಹೆಸರು",
    visitorNamePlaceholder: "ಉದಾ: ರಮೇಶ್ ಶರ್ಮಾ",
    visitorEmail: "ಇಮೇಲ್ ವಿಳಾಸ",
    visitorEmailPlaceholder: "ಉದಾ: ramesh@example.com",
    visitorPhone: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (10 ಅಂಕಿ)",
    visitorPhonePlaceholder: "9876543210",
    idTypeLabel: "ಗುರುತಿನ ಚೀಟಿ ಪ್ರಕಾರ",
    purpose: "ಭೇಟಿಯ ಉದ್ದೇಶ (ಐಚ್ಛಿಕ)",
    purposePlaceholder: "ಉದಾ: ಸಂದರ್ಶನ, ವಿತರಣೆ, ಸಭೆ",
    nextStep: "ಮುಂದೆ",
    backStep: "ಹಿಂದೆ",

    whoInvitedTitle: "ಯಾರು ಆಹ್ವಾನಿಸಿದ್ದಾರೆ?",
    whoInvitedDesc: "ಹುಡುಕಲು ಉದ್ಯೋಗಿ ಹೆಸರು ಅಥವಾ ವಿಭಾಗವನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    searchEmployeePlaceholder: "ಉದ್ಯೋಗಿ ಹೆಸರು ಅಥವಾ ವಿಭಾಗ ಹುಡುಕಿ...",
    noEmployeesFound: "ಯಾವುದೇ ಉದ್ಯೋಗಿ ಕಂಡುಬಂದಿಲ್ಲ.",

    idPhotoTitle: "ಗುರುತಿನ ಚೀಟಿ ಮತ್ತು ಖಚಿತಪಡಿಸುವಿಕೆ",
    idPhotoDesc: "ಗುರುತಿನ ಚೀಟಿಯ ಪ್ರಕಾರವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಫೋಟೋ ಅಥವಾ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
    idMethodPhoto: "ಗುರುತಿನ ಚೀಟಿಯ ಫೋಟೋ",
    idMethodNumber: "ಗುರುತಿನ ಚೀಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
    idNumberLabel: "ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿ / ಆಧಾರ್ ಸಂಖ್ಯೆ",
    idNumberPlaceholder: "ಗುರುತಿನ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    takePhotoId: "ಗುರುತಿನ ಚೀಟಿಯ ಫೋಟೋ ತೆಗೆಯಿರಿ",
    takeVisitorPhoto: "ಸಂದರ್ಶಕರ ಫೋಟೋ ತೆಗೆಯಿರಿ (ಐಚ್ಛಿಕ)",
    idPhotoAttached: "ಗುರುತಿನ ಚೀಟಿ ಲಗತ್ತಿಸಲಾಗಿದೆ",
    visitorPhotoAttached: "ಸಂದರ್ಶಕರ ಫೋಟೋ ಲಗತ್ತಿಸಲಾಗಿದೆ",
    retake: "ಮತ್ತೆ ತೆಗೆಯಿರಿ",
    reviewSummary: "ರವಾನಿಸುವ ಮುನ್ನ ಪರಿಶೀಲಿಸಿ",
    sendRequest: "ಆತಿಥೇಯರಿಗೆ ವಿನಂತಿ ಕಳುಹಿಸಿ",
    sendingRequest: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",

    waitingHost: "ಆತಿಥೇಯರ ಅನುಮೋದನೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
    waitingApprovalFrom: "ಇವರ ಅನುಮೋದನೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
    askOtp: "ಸಂದರ್ಶಕರಿಂದ 6-ಅಂಕಿಯ OTP ಕೇಳಿ",
    approvedAskOtp: "ಆತಿಥೇಯರು ಅನುಮೋದಿಸಿದ್ದಾರೆ. ಸಂದರ್ಶಕರ ಇಮೇಲ್‌ಗೆ ಕಳುಹಿಸಿದ 6-ಅಂಕಿಯ ಕೋಡ್ ಕೇಳಿ.",
    entryDenied: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ",
    deniedByHost: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಗೇಟ್ ದಾಟಲು ಬಿಡಬೇಡಿ.",
    requestExpired: "ವಿನಂತಿ ಅವಧಿ ಮುಗಿದಿದೆ. ಹೊಸ ವಿನಂತಿ ಪ್ರಾರಂಭಿಸಿ.",
    allowEntry: "ಅಂಗೀಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಂದರ್ಶಕರನ್ನು ಒಳಗೆ ಕಳುಹಿಸಿ.",
    codeMatchedAllow: "ಅಂಗೀಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಂದರ್ಶಕರನ್ನು ಒಳಗೆ ಕಳುಹಿಸಿ.",
    requestExpiresIn: "ವಿನಂತಿ ಮುಕ್ತಾಯಗೊಳ್ಳಲು ಉಳಿದ ಸಮಯ",
    enter6DigitOtp: "ಸಂದರ್ಶಕರಿಂದ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ",
    verifyCode: "ಕೋಡ್ ಪರಿಶೀಲಿಸಿ",
    wrongCodeAttemptsLeft: "ತಪ್ಪು ಕೋಡ್.",
    attemptsRemaining: "ಪ್ರಯತ್ನಗಳು ಬಾಕಿ ಇವೆ",
    requestLocked3Attempts: "ವಿನಂತಿ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. 3 ತಪ್ಪು ಪ್ರಯತ್ನಗಳು. ಹೊಸ ವಿನಂತಿ ಪ್ರಾರಂಭಿಸಿ.",
    visitorLeft: "ಸಂದರ್ಶಕರು ನಿರ್ಗಮಿಸಿದ್ದಾರೆ",
    recordingExit: "ನಿರ್ಗಮನ ದಾಖಲಿಸಲಾಗುತ್ತಿದೆ...",
    startNewRequest: "ಮುಂದಿನ ಸಂದರ್ಶಕರನ್ನು ನೋಂದಾಯಿಸಿ",

    todaysVisitorsTitle: "ಇಂದಿನ ಸಂದರ್ಶಕರು",
    todaysVisitorsDesc: "ಇಂದು ಗೇಟ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾದ ಎಲ್ಲಾ ಸಂದರ್ಶಕರು.",
    noVisitorsToday: "ಇಂದು ಯಾವುದೇ ಸಂದರ್ಶಕರು ನೋಂದಾಯಿಸಿಲ್ಲ.",
    exitRecorded: "ನಿರ್ಗಮನ ದಾಖಲಾಗಿದೆ",
    backToHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",

    enterNameError: "ದಯವಿಟ್ಟು ಸಂದರ್ಶಕರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
    enterEmailError: "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.",
    enterPhoneError: "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.",
    selectHostError: "ದಯವಿಟ್ಟು ಆತಿಥೇಯ ಉದ್ಯೋಗಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    selectIdTypeError: "ದಯವಿಟ್ಟು ಗುರುತಿನ ಚೀಟಿಯ ಪ್ರಕಾರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    uploadPhotoError: "ದಯವಿಟ್ಟು ಗುರುತಿನ ಚೀಟಿಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
    completeOtpError: "ದಯವಿಟ್ಟು ಪೂರ್ಣ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ.",
    emailCouldNotBeSent: "ಇಮೇಲ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಆತಿಥೇಯರಿಗೆ ಕರೆ ಮಾಡಿ.",
    retrySendingEmail: "ಇಮೇಲ್ ಪುನಃ ಕಳುಹಿಸಿ",
    retryingEmail: "ರವಾನಿಸಲಾಗುತ್ತಿದೆ...",
    emailSentSuccess: "ಆತಿಥೇಯರಿಗೆ ಇಮೇಲ್ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ.",
    callHostDirectly: "ದಯವಿಟ್ಟು ನೇರವಾಗಿ ಆತಿಥೇಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
};
