import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { api } from '../api/client';

export function AuthScreen() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup' | 'forgot'

  // --- SIGN IN STATE ---
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- SIGN UP STATE ---
  const [signupRole, setSignupRole] = useState('student'); // 'student' | 'faculty'
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupDeptId, setSignupDeptId] = useState('dept-cse-01');
  // Student specific
  const [signupRollNo, setSignupRollNo] = useState('');
  const [signupRegNo, setSignupRegNo] = useState('');
  const [signupBatchId, setSignupBatchId] = useState('batch-cse-4a');
  const [signupSection, setSignupSection] = useState('A');
  const [signupGuardian, setSignupGuardian] = useState('');
  const [signupGuardianPhone, setSignupGuardianPhone] = useState('');
  // Faculty specific
  const [signupStaffId, setSignupStaffId] = useState('');
  const [signupDesignation, setSignupDesignation] = useState('Assistant Professor');
  const [signupQualification, setSignupQualification] = useState('M.Tech, Ph.D.');
  const [signupSpecialization, setSignupSpecialization] = useState('Computer Science');
  const [signupPhone, setSignupPhone] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState('');

  // --- FORGOT PASSWORD STATE ---
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: enter code & new pass
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [devFallbackAvailable, setDevFallbackAvailable] = useState(false);

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    loadAcademicLookups();
  }, []);

  async function loadAcademicLookups() {
    try {
      const [dRes, bRes] = await Promise.all([
        api.getDepartments(),
        api.getBatches()
      ]);
      if (dRes.ok && dRes.data.success) {
        setDepartments(dRes.data.data || []);
      }
      if (bRes.ok && bRes.data.success) {
        setBatches(bRes.data.data || []);
      }
    } catch (e) {}
  }

  // --- HANDLERS ---
  const handleLogin = async (loginIdentifier, loginPass) => {
    setError('');

    // On web, read from DOM elements if state is empty (supports browser autofill & password managers)
    let domId = '';
    let domPass = '';
    if (typeof document !== 'undefined') {
      const inputs = document.querySelectorAll('input');
      if (inputs.length >= 2) {
        domId = inputs[0]?.value || '';
        domPass = inputs[1]?.value || '';
      }
    }

    const rawId = loginIdentifier !== undefined ? loginIdentifier : (identifier || domId);
    const rawPass = loginPass !== undefined ? loginPass : (password || domPass);
    const targetIdentifier = (rawId || '').toString().trim();
    const targetPass = (rawPass || '').toString().trim();

    if (!targetIdentifier || !targetPass) {
      setError('Please enter your Email / Roll Number and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(targetIdentifier, targetPass);
      if (!res.success) {
        setError(res.message || 'Invalid credentials. Please verify your login ID and password.');
      }
    } catch (err) {
      setError('Connection failed. Please ensure the backend server is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSignupSuccess('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setError('Name, email, and password are required for registration.');
      return;
    }

    setSignupLoading(true);

    const payload = {
      name: signupName.trim(),
      email: signupEmail.trim(),
      password: signupPassword,
      role: signupRole,
      department_id: signupDeptId,
      require_approval: requireApproval
    };

    if (signupRole === 'student') {
      payload.roll_no = signupRollNo.trim();
      payload.register_no = signupRegNo.trim();
      payload.batch_id = signupBatchId;
      payload.guardian_name = signupGuardian.trim();
      payload.guardian_phone = signupGuardianPhone.trim();
    } else {
      payload.staff_id = signupStaffId.trim();
      payload.designation = signupDesignation;
      payload.qualification = signupQualification;
      payload.specialization = signupSpecialization;
      payload.phone = signupPhone.trim();
    }

    const res = await api.register(payload);
    setSignupLoading(false);

    if (res.ok && res.data.success) {
      if (requireApproval || res.data.status === 'pending_approval') {
        setSignupSuccess('Account submitted successfully! It is pending College Administrator approval. You may log in once approved.');
      } else {
        // Automatically login if activated
        const loginRes = await login(signupEmail, signupPassword);
        if (!loginRes.success) {
          setSignupSuccess('Account created! Please sign in with your credentials.');
          setActiveTab('signin');
          setIdentifier(signupEmail);
        }
      }
    } else {
      setError(res.data?.message || 'Registration failed. Please check the entered information.');
    }
  };

  const handleRequestResetCode = async () => {
    setError('');
    setForgotSuccess('');
    if (!forgotIdentifier.trim()) {
      setError('Please enter your registered Email, Roll Number, or Staff ID.');
      return;
    }

    setForgotLoading(true);
    setDevFallbackAvailable(false);
    const res = await api.forgotPassword(forgotIdentifier.trim());
    setForgotLoading(false);

    if (res.ok && res.data.success) {
      // Ensure verification code/OTP input starts completely empty - DO NOT autofill
      setResetCode('');
      setNewPassword('');
      setForgotStep(2);
      setDevFallbackAvailable(false);
      setForgotSuccess(
        res.data?.message && !res.data.message.includes('[Dev Mode]')
          ? res.data.message
          : 'A 6-digit verification code has been sent to your registered email.'
      );
    } else {
      setError(res.data?.message || 'No account found matching this identifier.');
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setForgotSuccess('');
    if (!resetCode.trim() || !newPassword) {
      setError('6-digit verification code and new password are required.');
      return;
    }

    if (resetCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setForgotLoading(true);
    const res = await api.resetPassword({
      identifier: forgotIdentifier.trim(),
      reset_code: resetCode.trim(),
      new_password: newPassword
    });
    setForgotLoading(false);

    if (res.ok && res.data.success) {
      setForgotSuccess(res.data.message || 'Password reset successfully!');
      setTimeout(() => {
        setActiveTab('signin');
        setIdentifier(forgotIdentifier);
        setPassword('');
        setResetCode('');
        setNewPassword('');
        setForgotStep(1);
        setForgotSuccess('');
      }, 1500);
    } else {
      setError(res.data?.message || 'Invalid or expired verification code.');
    }
  };

  const quickLogins = [
    {
      role: 'Student (Alex Rivera)',
      id: '24CSE101',
      email: 'student@apex.edu',
      pass: 'Student@123',
      desc: 'Browse courses, take exams, submit assignments, view split marks',
      icon: '🎓'
    },
    {
      role: 'Faculty (Sarah Jenkins)',
      id: 'FAC-CSE-001',
      email: 'faculty@apex.edu',
      pass: 'Faculty@123',
      desc: 'Create exams, enter split marks, evaluate assignments',
      icon: '👨‍🏫'
    },
    {
      role: 'Dean / Administrator',
      id: 'admin@apex.edu',
      email: 'admin@apex.edu',
      pass: 'Admin@123',
      desc: 'Manage departments, batches, faculty and student directory',
      icon: '🏛️'
    },
    {
      role: 'Super Admin',
      id: 'admin@zenora.com',
      email: 'admin@zenora.com',
      pass: 'Admin@123',
      desc: 'Platform configuration, institutions, and global settings',
      icon: '👑'
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.authBox}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏛️</Text>
          </View>
          <Text style={styles.brandTitle}>ZENORA LMS</Text>
          <Text style={styles.brandSubtitle}>Academic Management & Student-Faculty Portal</Text>
        </View>

        {/* Top Mode Navigation Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'signin' && styles.navTabActive]}
            onPress={() => { setActiveTab('signin'); setError(''); }}
          >
            <Text style={[styles.navTabText, activeTab === 'signin' && styles.navTabTextActive]}>
              🔐 Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'signup' && styles.navTabActive]}
            onPress={() => { setActiveTab('signup'); setError(''); }}
          >
            <Text style={[styles.navTabText, activeTab === 'signup' && styles.navTabTextActive]}>
              ✍️ Sign Up & Onboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'forgot' && styles.navTabActive]}
            onPress={() => {
              setActiveTab('forgot');
              setError('');
              setForgotSuccess('');
              setResetCode('');
              setNewPassword('');
              setForgotStep(1);
            }}
          >
            <Text style={[styles.navTabText, activeTab === 'forgot' && styles.navTabTextActive]}>
              🔑 Reset Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alerts */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {signupSuccess ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>{signupSuccess}</Text>
          </View>
        ) : null}

        {forgotSuccess ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>{forgotSuccess}</Text>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* TAB 1: SIGN IN FORM                                       */}
        {/* ========================================================= */}
        {activeTab === 'signin' && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In to Academic Workspace</Text>
            <Text style={styles.formSubtitle}>
              Authenticate using your registered Email, Roll Number, University Register Number, or Staff ID.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address or Academic ID (Roll No / Staff ID)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. student@apex.edu, 24CSE101, or FAC-CSE-001"
                placeholderTextColor={colors.textMuted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => handleLogin(identifier, password)}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => setActiveTab('forgot')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onSubmitEditing={() => handleLogin(identifier, password)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  testID="passwordVisibilityToggle"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={showPassword ? colors.primaryLight : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { marginTop: 6, marginBottom: 10 }]}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.submitBtn}
              accessibilityRole="button"
              testID="signInButton"
              onPress={() => handleLogin(identifier, password)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.helperTipBox}>
              <Text style={styles.helperTipText}>
                💡 <Text style={{ fontWeight: 'bold', color: colors.primaryLight }}>Student Tip:</Text> Newly registered and existing students can log in using either their <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Roll Number</Text> (e.g. <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>24CSE101</Text>) or <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Email</Text>, with default password <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>Student@123</Text> or their University Register Number.
              </Text>
              <TouchableOpacity
                style={styles.quickFillBtn}
                onPress={() => {
                  setIdentifier('24CSE101');
                  setPassword('Student@123');
                  setError('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickFillBtnText}>⚡ Fill Student: 24CSE101 / Student@123</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SIGN UP / REGISTRATION FORM                        */}
        {/* ========================================================= */}
        {activeTab === 'signup' && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>Institution User Registration</Text>
            <Text style={styles.formSubtitle}>
              Create your academic account with institutional details for automatic class enrollment.
            </Text>

            {/* Role Toggle */}
            <View style={styles.roleToggleGroup}>
              <TouchableOpacity
                style={[styles.roleToggleBtn, signupRole === 'student' && styles.roleToggleBtnActive]}
                onPress={() => setSignupRole('student')}
              >
                <Text style={styles.roleToggleIcon}>🎓</Text>
                <Text style={[styles.roleToggleText, signupRole === 'student' && styles.roleToggleTextActive]}>
                  Student Onboarding
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleToggleBtn, signupRole === 'faculty' && styles.roleToggleBtnActive]}
                onPress={() => setSignupRole('faculty')}
              >
                <Text style={styles.roleToggleIcon}>👨‍🏫</Text>
                <Text style={[styles.roleToggleText, signupRole === 'faculty' && styles.roleToggleTextActive]}>
                  Faculty / Staff Onboarding
                </Text>
              </TouchableOpacity>
            </View>

            {/* Common Fields */}
            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={signupRole === 'student' ? 'e.g. Vikram Sharma' : 'e.g. Dr. Rajesh Kumar'}
                  placeholderTextColor={colors.textMuted}
                  value={signupName}
                  onChangeText={setSignupName}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Official Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. vikram@apex.edu"
                  placeholderTextColor={colors.textMuted}
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.textMuted}
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    secureTextEntry={!showSignupPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showSignupPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={showSignupPassword ? colors.primaryLight : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Academic Department</Text>
                <View style={styles.pickerWrapper}>
                  {departments.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {departments.map(d => (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.chip, signupDeptId === d.id && styles.chipActive]}
                            onPress={() => setSignupDeptId(d.id)}
                          >
                            <Text style={[styles.chipText, signupDeptId === d.id && styles.chipTextActive]}>
                              {d.code}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Computer Science & Eng (CSE)</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Student Specific Fields */}
            {signupRole === 'student' && (
              <>
                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>College Roll Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 24CSE105"
                      placeholderTextColor={colors.textMuted}
                      value={signupRollNo}
                      onChangeText={setSignupRollNo}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>University Register Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 312224104005"
                      placeholderTextColor={colors.textMuted}
                      value={signupRegNo}
                      onChangeText={setSignupRegNo}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Class Batch</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {batches.slice(0, 3).map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.chip, signupBatchId === b.id && styles.chipActive]}
                          onPress={() => setSignupBatchId(b.id)}
                        >
                          <Text style={[styles.chipText, signupBatchId === b.id && styles.chipTextActive]}>
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Section</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['A', 'B', 'C'].map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, signupSection === sec && styles.chipActive]}
                          onPress={() => setSignupSection(sec)}
                        >
                          <Text style={[styles.chipText, signupSection === sec && styles.chipTextActive]}>
                            Sec {sec}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Guardian / Parent Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Ramesh Sharma"
                      placeholderTextColor={colors.textMuted}
                      value={signupGuardian}
                      onChangeText={setSignupGuardian}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Guardian Contact Phone</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+1 (555) 987-1234"
                      placeholderTextColor={colors.textMuted}
                      value={signupGuardianPhone}
                      onChangeText={setSignupGuardianPhone}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Faculty Specific Fields */}
            {signupRole === 'faculty' && (
              <>
                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Staff ID / Employee Code *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. FAC-CSE-005"
                      placeholderTextColor={colors.textMuted}
                      value={signupStaffId}
                      onChangeText={setSignupStaffId}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Designation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Assistant Professor"
                      placeholderTextColor={colors.textMuted}
                      value={signupDesignation}
                      onChangeText={setSignupDesignation}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Highest Qualification</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. M.E., Ph.D."
                      placeholderTextColor={colors.textMuted}
                      value={signupQualification}
                      onChangeText={setSignupQualification}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Academic Specialization</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Machine Learning & Algorithms"
                      placeholderTextColor={colors.textMuted}
                      value={signupSpecialization}
                      onChangeText={setSignupSpecialization}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contact Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (555) 234-5678"
                    placeholderTextColor={colors.textMuted}
                    value={signupPhone}
                    onChangeText={setSignupPhone}
                  />
                </View>
              </>
            )}

            {/* Admin Verification Toggle */}
            <TouchableOpacity
              style={styles.approvalCheckboxRow}
              onPress={() => setRequireApproval(!requireApproval)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, requireApproval && styles.checkboxChecked]}>
                {requireApproval && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.checkboxLabel}>Submit for Administrator Verification & Approval</Text>
                <Text style={styles.checkboxSub}>
                  When checked, this account will be placed into the Pending Approval queue for Dean verification.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={signupLoading}
              activeOpacity={0.85}
            >
              {signupLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  Complete {signupRole === 'student' ? 'Student' : 'Faculty'} Registration
                </Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FORGOT & RESET PASSWORD                            */}
        {/* ========================================================= */}
        {activeTab === 'forgot' && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>Reset Account Password</Text>
            <Text style={styles.formSubtitle}>
              Request a 6-digit verification code to update your academic workspace password.
            </Text>

            {forgotStep === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address or Academic ID (Roll No / Staff ID)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. student@apex.edu or 24CSE101"
                    placeholderTextColor={colors.textMuted}
                    value={forgotIdentifier}
                    onChangeText={setForgotIdentifier}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRequestResetCode}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Generate Reset Code →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-Digit Verification Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.textMuted}
                    value={resetCode}
                    onChangeText={(val) => setResetCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                    Type the 6-digit security code sent to your registered email.
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={showNewPassword ? colors.primaryLight : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Update & Save Password</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 14, alignItems: 'center' }}
                  onPress={() => {
                    setForgotStep(1);
                    setResetCode('');
                    setNewPassword('');
                    setForgotSuccess('');
                    setError('');
                    setDevFallbackAvailable(false);
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>← Request a different code</Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        )}

        {/* 1-Click Fast Demo Credentials Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoHeader}>⚡ ONE-CLICK ROLE EXPLORER</Text>
          <Text style={styles.demoSub}>
            Select any registered persona below to fill credentials and validate authentic database login:
          </Text>

          <View style={styles.demoGrid}>
            {quickLogins.map(item => (
              <TouchableOpacity
                key={item.role}
                style={styles.demoCard}
                onPress={() => {
                  setActiveTab('signin');
                  setIdentifier(item.email);
                  setPassword(item.pass);
                  handleLogin(item.email, item.pass);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.demoCardHeader}>
                  <Text style={styles.demoIcon}>{item.icon}</Text>
                  <Text style={styles.demoRole}>{item.role}</Text>
                </View>
                <Text style={styles.demoDesc}>{item.desc}</Text>
                <View style={styles.demoActionRow}>
                  <Text style={styles.demoEmail}>{item.email}</Text>
                  <Text style={styles.demoLoginArrow}>Login →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  authBox: {
    width: '100%',
    maxWidth: 720
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  logoIcon: {
    fontSize: 28
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    letterSpacing: 2
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 4,
    textAlign: 'center'
  },
  navTabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  navTabActive: {
    backgroundColor: colors.primary
  },
  navTabText: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold
  },
  navTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  formCard: {
    padding: 24,
    marginBottom: 24
  },
  formTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginBottom: 4
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginBottom: 18,
    lineHeight: 18
  },
  roleToggleGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  roleToggleBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderColor: colors.primary
  },
  roleToggleIcon: {
    fontSize: 16,
    marginRight: 6
  },
  roleToggleText: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium
  },
  roleToggleTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.bold
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  inputGroup: {
    marginBottom: 14
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    marginBottom: 6
  },
  forgotLink: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: typography.size.sm
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    overflow: 'hidden'
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: typography.size.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pickerWrapper: {
    paddingVertical: 4
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  approvalCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: colors.primary
  },
  checkmark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  checkboxLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  checkboxSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8
  },
  errorText: {
    color: '#F87171',
    fontSize: typography.size.xs,
    flex: 1
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  successIcon: {
    fontSize: 18,
    marginRight: 8
  },
  successText: {
    color: '#34D399',
    fontSize: typography.size.xs,
    flex: 1
  },
  helperTipBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)'
  },
  helperTipText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },
  quickFillBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  quickFillBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  demoSection: {
    marginTop: 10
  },
  demoHeader: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginBottom: 4
  },
  demoSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 12
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  demoCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    padding: 14
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  demoIcon: {
    fontSize: 16,
    marginRight: 8
  },
  demoRole: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  demoDesc: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 14
  },
  demoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  demoEmail: {
    color: colors.primaryLight,
    fontSize: 10
  },
  demoLoginArrow: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.weight.bold
  }
});
