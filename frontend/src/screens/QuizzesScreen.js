import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

const QUIZ_STORAGE_KEY = 'zenora_active_quiz_session';

export function QuizzesScreen() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'available', 'upcoming', 'completed'

  // Faculty/Admin filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [semFilter, setSemFilter] = useState('all');

  // Active Examination Taking State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [timeLeftSecs, setTimeLeftSecs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitNotice, setAutoSubmitNotice] = useState(false);

  // Keep references to active state for timer callbacks
  const activeQuizRef = useRef(activeQuiz);
  const activeAttemptRef = useRef(activeAttempt);
  const answersRef = useRef(selectedAnswers);

  useEffect(() => {
    activeQuizRef.current = activeQuiz;
  }, [activeQuiz]);

  useEffect(() => {
    activeAttemptRef.current = activeAttempt;
  }, [activeAttempt]);

  useEffect(() => {
    answersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  // Create Quiz Modal State (Instructors)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTimeLimit, setNewTimeLimit] = useState('20');
  const [newPassingPct, setNewPassingPct] = useState('60');
  const [newInstructions, setNewInstructions] = useState('');

  // Edit Quiz Modal State (Staff)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTimeLimit, setEditTimeLimit] = useState('20');
  const [editPassingPct, setEditPassingPct] = useState('60');
  const [editInstructions, setEditInstructions] = useState('');
  const [editMaxAttempts, setEditMaxAttempts] = useState('3');
  const [savingEdit, setSavingEdit] = useState(false);

  const isStaff = ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(user?.role);
  const studentProfile = user?.student_profile;

  // Restore active quiz state from localStorage on page reload
  useEffect(() => {
    loadQuizzes();

    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.quiz && parsed.attempt && parsed.expiresAt) {
            const remaining = Math.round((parsed.expiresAt - Date.now()) / 1000);
            if (remaining > 0) {
              setActiveQuiz(parsed.quiz);
              setActiveAttempt(parsed.attempt);
              setSelectedAnswers(parsed.answers || {});
              setCurrentQuestionIndex(parsed.questionIndex || 0);
              setTimeLeftSecs(remaining);
              setIsSubmitted(false);
            } else {
              // Time expired while user was away
              setActiveQuiz(parsed.quiz);
              setActiveAttempt(parsed.attempt);
              setSelectedAnswers(parsed.answers || {});
              setTimeLeftSecs(0);
              setAutoSubmitNotice(true);
              autoSubmitExpiredQuiz(parsed.quiz, parsed.attempt, parsed.answers || {});
            }
          }
        } catch (e) {
          console.warn('[Restore Quiz Error]', e);
        }
      }
    }
  }, []);

  async function autoSubmitExpiredQuiz(quiz, attempt, draftAnswers) {
    setSubmitting(true);
    try {
      const payload = Object.entries(draftAnswers).map(([qId, optId]) => ({
        question_id: qId,
        selected_option_id: optId
      }));

      const res = await api.submitQuiz(quiz.id, {
        attempt_id: attempt.id,
        answers: payload
      });
      if (res.ok && res.data.success) {
        setExamResult(res.data.result);
        setIsSubmitted(true);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(QUIZ_STORAGE_KEY);
        }
        loadQuizzes();
      }
    } catch (err) {
      console.error('[Auto Submit Error]', err);
    } finally {
      setSubmitting(false);
    }
  }

  // Timer countdown hook for examination security & auto-submit on expiry
  useEffect(() => {
    let interval = null;
    if (activeAttempt && timeLeftSecs > 0 && !isSubmitted && !examResult) {
      interval = setInterval(() => {
        setTimeLeftSecs(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setAutoSubmitNotice(true);
            // Auto submit with latest answers from ref
            if (activeQuizRef.current && activeAttemptRef.current) {
              const currentQuiz = activeQuizRef.current;
              const currentAttempt = activeAttemptRef.current;
              const payloadAnswers = Object.entries(answersRef.current || {}).map(([qId, optId]) => ({
                question_id: qId,
                selected_option_id: optId
              }));

              setSubmitting(true);
              api.submitQuiz(currentQuiz.id, {
                attempt_id: currentAttempt.id,
                answers: payloadAnswers
              }).then(res => {
                if (res.ok && res.data.success) {
                  setExamResult(res.data.result);
                  setIsSubmitted(true);
                  if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
                  }
                  loadQuizzes();
                }
              }).catch(err => {
                console.error('[Timer Expiry Auto-Submit Error]', err);
              }).finally(() => {
                setSubmitting(false);
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeAttempt, timeLeftSecs, isSubmitted, examResult]);

  const [error, setError] = useState(null);

  async function loadQuizzes() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuizzes();
      if (res.ok && res.data.success) {
        setQuizzes(res.data.data || []);
      } else {
        setError(res.data?.message || 'Failed to retrieve examinations.');
      }
    } catch (err) {
      console.error('[Load Quizzes Error]', err);
      setError('Network connection failed. Unable to load examinations.');
    } finally {
      setLoading(false);
    }
  }

  // ==============================================================
  // 1. START ASSESSMENT
  // ==============================================================
  async function handleStartQuiz(quizId) {
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setExamResult(null);
    setAutoSubmitNotice(false);

    // Clear previous storage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    }

    try {
      const startRes = await api.startQuiz(quizId);
      if (startRes.ok && startRes.data?.success) {
        let questions = startRes.data.questions || startRes.data.quiz?.questions || [];
        
        // Double-safeguard: if questions array is empty in start response, fetch quiz directly
        if (!questions || questions.length === 0) {
          const qRes = await api.getQuiz(quizId);
          if (qRes.ok && qRes.data?.data?.questions) {
            questions = qRes.data.data.questions;
          }
        }

        const quizObj = {
          ...(startRes.data.quiz || {}),
          id: quizId,
          questions
        };

        const attemptObj = startRes.data.attempt || {
          id: startRes.data.attemptId || 'att-' + Date.now(),
          attempt_number: 1
        };

        const durationMinutes = Number(
          startRes.data.durationMinutes ||
          quizObj.durationMinutes ||
          quizObj.time_limit_minutes ||
          quizObj.time_limit ||
          20
        );
        const totalSecs = durationMinutes * 60;
        const expiresAt = Date.now() + (totalSecs * 1000);

        setActiveQuiz(quizObj);
        setActiveAttempt(attemptObj);
        setTimeLeftSecs(totalSecs);
        setSelectedAnswers({});
        setCurrentQuestionIndex(0);
        setIsSubmitted(false);
        setExamResult(null);

        // Persist quiz state in localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
            quiz: quizObj,
            attempt: attemptObj,
            answers: {},
            questionIndex: 0,
            expiresAt,
            startedAt: Date.now()
          }));
        }
      } else {
        alert(startRes.data?.message || 'Could not start assessment.');
      }
    } catch (err) {
      console.error('[Start Quiz Error]', err);
      alert('Failed to connect to assessment server.');
    } finally {
      setLoading(false);
    }
  }

  // ==============================================================
  // 2. RETEST / RETAKE ASSESSMENT (Fix Retest Bug)
  // ==============================================================
  async function handleRetakeQuiz(quizId) {
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setExamResult(null);
    setAutoSubmitNotice(false);

    // Clear previous quiz session from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    }

    try {
      const retakeRes = await api.retakeQuiz(quizId);
      if (retakeRes.ok && retakeRes.data?.success) {
        let questions = retakeRes.data.questions || retakeRes.data.quiz?.questions || [];

        // Double-safeguard: if questions are empty in response, fetch quiz directly
        if (!questions || questions.length === 0) {
          const qRes = await api.getQuiz(quizId);
          if (qRes.ok && qRes.data?.data?.questions) {
            questions = qRes.data.data.questions;
          }
        }

        const quizObj = {
          ...(retakeRes.data.quiz || {}),
          id: quizId,
          questions
        };

        const attemptObj = retakeRes.data.attempt || {
          id: retakeRes.data.attemptId || 'att-' + Date.now(),
          attempt_number: (retakeRes.data.attempt?.attempt_number || 2)
        };

        const durationMinutes = Number(
          retakeRes.data.durationMinutes ||
          quizObj.durationMinutes ||
          quizObj.time_limit_minutes ||
          quizObj.time_limit ||
          20
        );
        const totalSecs = durationMinutes * 60;
        const expiresAt = Date.now() + (totalSecs * 1000);

        // Wipe component state cleanly
        setActiveQuiz(quizObj);
        setActiveAttempt(attemptObj);
        setTimeLeftSecs(totalSecs);
        setSelectedAnswers({});
        setCurrentQuestionIndex(0);
        setIsSubmitted(false);
        setExamResult(null);

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
            quiz: quizObj,
            attempt: attemptObj,
            answers: {},
            questionIndex: 0,
            expiresAt,
            startedAt: Date.now()
          }));
        }
      } else {
        alert(retakeRes.data?.message || 'Failed to initialize retest attempt.');
      }
    } catch (err) {
      console.error('[Retake Quiz Error]', err);
      alert('Unable to initialize retest attempt.');
    } finally {
      setLoading(false);
    }
  }

  // Option selection
  function handleSelectOption(qId, optId) {
    if (isSubmitted || examResult) return;

    const nextAnswers = {
      ...selectedAnswers,
      [qId]: optId
    };
    setSelectedAnswers(nextAnswers);

    // Save updated answers to localStorage
    if (typeof window !== 'undefined' && window.localStorage && activeAttempt) {
      try {
        const stored = window.localStorage.getItem(QUIZ_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.answers = nextAnswers;
          parsed.questionIndex = currentQuestionIndex;
          window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  }

  // Navigation handlers
  function handleNextQuestion() {
    if (!activeQuiz?.questions) return;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  function handlePrevQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }

  // Submit handler
  async function handleSubmitExam() {
    if (!activeQuiz || !activeAttempt) return;

    const answeredCount = Object.keys(selectedAnswers).length;
    const totalCount = activeQuiz.questions?.length || 0;

    if (answeredCount < totalCount) {
      const confirmSubmit = window.confirm
        ? window.confirm(`You have answered ${answeredCount} of ${totalCount} questions. Submit assessment now?`)
        : true;
      if (!confirmSubmit) return;
    }

    setSubmitting(true);

    const payloadAnswers = Object.entries(selectedAnswers).map(([qId, optId]) => ({
      question_id: qId,
      selected_option_id: optId
    }));

    try {
      const res = await api.submitQuiz(activeQuiz.id, {
        attempt_id: activeAttempt.id,
        answers: payloadAnswers
      });

      if (res.ok && res.data.success) {
        setExamResult(res.data.result);
        setIsSubmitted(true);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(QUIZ_STORAGE_KEY);
        }
        loadQuizzes();
      } else {
        alert(res.data?.message || 'Submission failed.');
      }
    } catch (err) {
      console.error('[Submit Error]', err);
      alert('Error submitting assessment answers.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateQuiz() {
    if (!newTitle.trim()) return;
    try {
      const res = await api.createQuiz({
        course_id: 'sub-cs401',
        title: newTitle.trim(),
        instructions: newInstructions.trim() || 'Continuous Internal Assessment MCQ Test',
        time_limit_minutes: Number(newTimeLimit) || 20,
        passing_percentage: Number(newPassingPct) || 60
      });
      if (res.ok && res.data?.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewInstructions('');
        loadQuizzes();
      } else {
        alert(res.data?.message || 'Failed to create assessment.');
      }
    } catch (e) {
      alert('Error creating assessment: ' + e.message);
    }
  }

  async function handleOpenEditQuiz(quiz) {
    setEditingQuiz(quiz);
    setEditTitle(quiz.title || '');
    setEditTimeLimit(String(quiz.time_limit_minutes || quiz.duration_minutes || '20'));
    setEditPassingPct(String(quiz.passing_percentage || quiz.pass_percentage || '60'));
    setEditInstructions(quiz.instructions || quiz.description || '');
    setEditMaxAttempts(String(quiz.max_attempts || '3'));
    setShowEditModal(true);
  }

  async function handleSaveEditQuiz() {
    if (!editTitle.trim()) {
      return alert('Assessment title is required.');
    }
    setSavingEdit(true);
    try {
      const res = await api.updateQuiz(editingQuiz.id, {
        title: editTitle.trim(),
        instructions: editInstructions.trim(),
        time_limit_minutes: Number(editTimeLimit) || 20,
        passing_percentage: Number(editPassingPct) || 60,
        max_attempts: Number(editMaxAttempts) || 3
      });

      if (res.ok && res.data?.success) {
        setShowEditModal(false);
        setEditingQuiz(null);
        loadQuizzes();
      } else {
        alert(res.data?.message || 'Failed to update assessment.');
      }
    } catch (e) {
      alert('Error updating assessment: ' + e.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteQuiz(quizId, title) {
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Permanently delete assessment: "${title}"?`)
      : true;
    if (!confirmed) return;

    try {
      const res = await api.deleteQuiz(quizId);
      if (res.ok && res.data?.success) {
        setQuizzes(prev => prev.filter(q => q.id !== quizId));
      } else {
        alert(res.data?.message || 'Failed to delete assessment.');
      }
    } catch (e) {
      alert('Error deleting assessment: ' + e.message);
    }
  }

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter quizzes by tab and staff filters
  const filteredQuizzes = quizzes.filter(q => {
    if (isStaff) {
      if (deptFilter !== 'all' && q.department_code !== deptFilter && q.department_id !== deptFilter) return false;
      if (semFilter !== 'all' && String(q.semester) !== String(semFilter)) return false;
    }
    if (activeTab === 'available') return q.category === 'available';
    if (activeTab === 'upcoming') return q.category === 'upcoming';
    if (activeTab === 'completed') return q.category === 'completed';
    return true;
  });

  const availableCount = quizzes.filter(q => q.category === 'available').length;
  const upcomingCount = quizzes.filter(q => q.category === 'upcoming').length;
  const completedCount = quizzes.filter(q => q.category === 'completed').length;

  const currentQuestions = activeQuiz?.questions || [];
  const currentQ = currentQuestions[currentQuestionIndex];
  const totalQuestions = currentQuestions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.headerTitle}>Online Assessments & Quizzes</Text>
            {user?.role === 'student' && studentProfile && (
              <View style={styles.cohortBadge}>
                <Text style={styles.cohortBadgeText}>
                  🎓 {studentProfile.department || 'CS'} • Sem {studentProfile.current_semester || 4}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>
            Standardized technical MCQ examinations with automated evaluation and instant retake capability.
          </Text>
        </View>

        {isStaff && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.createBtnText}>+ Create Assessment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================== */}
      {/* ACTIVE EXAMINATION / RETEST PLAYER VIEW                        */}
      {/* ============================================================== */}
      {activeQuiz && (
        <GlassCard style={styles.examCard}>
          {/* Exam Header */}
          <View style={styles.examHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.examTitle}>{activeQuiz.title}</Text>
                <Badge
                  label={`Attempt #${activeAttempt?.attempt_number || 1}`}
                  variant="primary"
                />
                {activeQuiz.subject_code && (
                  <Badge label={activeQuiz.subject_code} variant="cyan" />
                )}
              </View>
              <Text style={styles.examInstructions}>{activeQuiz.instructions || activeQuiz.description}</Text>
            </View>

            {/* Countdown Timer Badge */}
            {!examResult && (
              <View style={[styles.timerBadge, timeLeftSecs < 180 && styles.timerUrgent]}>
                <Text style={styles.timerIcon}>⏱</Text>
                <View>
                  <Text style={styles.timerLabel}>REMAINING TIME</Text>
                  <Text style={styles.timerText}>{formatTimer(timeLeftSecs)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Auto-Submit Notice on Timer Expiry */}
          {autoSubmitNotice && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredBannerTitle}>⏰ Examination Time Expired</Text>
              <Text style={styles.expiredBannerDesc}>
                Your assessment answers were automatically submitted and graded upon timer expiration.
              </Text>
            </View>
          )}

          {/* POST-SUBMISSION RESULTS VIEW */}
          {examResult ? (
            <View style={[styles.resultBanner, examResult.is_passed ? styles.resPassed : styles.resFailed]}>
              <Text style={{ fontSize: 36, marginBottom: 6 }}>{examResult.is_passed ? '🎉' : '⚠️'}</Text>
              <Text style={styles.resScore}>
                Score: {examResult.percentage}% ({examResult.total_score} / {examResult.max_score} Marks)
              </Text>
              <Badge
                label={examResult.is_passed ? 'EXAM PASSED ✓' : 'NEEDS RETAKE'}
                variant={examResult.is_passed ? 'success' : 'danger'}
              />
              <Text style={styles.resFeedback}>{examResult.feedback}</Text>

              {/* Action Buttons */}
              <View style={styles.resultActionsRow}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => handleRetakeQuiz(activeQuiz.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.retakeBtnText}>
                    🔄 Retake Assessment (Attempt #{(activeAttempt?.attempt_number || 1) + 1})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeExamBtn}
                  onPress={() => {
                    setActiveQuiz(null);
                    setActiveAttempt(null);
                    setExamResult(null);
                    setIsSubmitted(false);
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
                    }
                  }}
                >
                  <Text style={styles.closeExamBtnText}>← Return to Assessments List</Text>
                </TouchableOpacity>
              </View>

              {/* Question Breakdown with Explanations */}
              <View style={styles.breakdownWrap}>
                <Text style={styles.breakdownHeading}>Detailed Questions Review:</Text>
                {(examResult.breakdown || []).map((item, idx) => (
                  <View key={item.question_id || idx} style={styles.breakdownItem}>
                    <View style={styles.breakdownTopRow}>
                      <Text style={styles.breakdownQNum}>Q{idx + 1}. {item.question_text}</Text>
                      <Badge
                        label={item.is_correct ? `+${item.points_awarded} pts ✓` : '0 pts ✕'}
                        variant={item.is_correct ? 'success' : 'danger'}
                      />
                    </View>
                    {item.explanation ? (
                      <Text style={styles.breakdownExpText}>💡 Explanation: {item.explanation}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* ACTIVE QUIZ STEP-BY-STEP PLAYER */
            totalQuestions > 0 && currentQ ? (
              <View style={styles.playerWrapper}>
                {/* Question Navigator Pills Bar */}
                <View style={styles.navPillsRow}>
                  <Text style={styles.navPillsLabel}>Questions:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {currentQuestions.map((q, idx) => {
                        const isCurrent = idx === currentQuestionIndex;
                        const isAnswered = Boolean(selectedAnswers[q.id]);
                        return (
                          <TouchableOpacity
                            key={q.id || idx}
                            style={[
                              styles.navPill,
                              isAnswered && styles.navPillAnswered,
                              isCurrent && styles.navPillCurrent
                            ]}
                            onPress={() => setCurrentQuestionIndex(idx)}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              styles.navPillText,
                              isAnswered && styles.navPillTextAnswered,
                              isCurrent && styles.navPillTextCurrent
                            ]}>
                              {idx + 1}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Question Box */}
                <View style={styles.questionCard}>
                  <View style={styles.qHeader}>
                    <Text style={styles.qNumber}>
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </Text>
                    <Badge label={`${currentQ.points || currentQ.marks || 5} Marks`} variant="cyan" />
                  </View>

                  <Text style={styles.qText}>{currentQ.question_text}</Text>

                  {/* Options Radio List */}
                  <View style={styles.optionsList}>
                    {(currentQ.options || []).map((opt, optIdx) => {
                      const optLetter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);
                      const isSelected = selectedAnswers[currentQ.id] === opt.id;

                      return (
                        <TouchableOpacity
                          key={opt.id || optIdx}
                          style={[styles.optRow, isSelected && styles.optSelected]}
                          onPress={() => handleSelectOption(currentQ.id, opt.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.radioCircle, isSelected && styles.radioActive]}>
                            {isSelected && <View style={styles.radioInnerDot} />}
                          </View>
                          <View style={styles.optLetterBox}>
                            <Text style={[styles.optLetterText, isSelected && styles.optLetterTextActive]}>
                              {optLetter}
                            </Text>
                          </View>
                          <Text style={[styles.optText, isSelected && styles.optTextActive]}>
                            {opt.option_text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Bottom Navigation & Submit Actions Bar */}
                <View style={styles.playerActionBar}>
                  <TouchableOpacity
                    style={[styles.navBtn, currentQuestionIndex === 0 && styles.navBtnDisabled]}
                    onPress={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.navBtnText, currentQuestionIndex === 0 && styles.navBtnTextDisabled]}>
                      ← Previous
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.answerProgressIndicator}>
                    <Text style={styles.answerProgressText}>
                      Answered: {answeredCount} / {totalQuestions}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <TouchableOpacity
                        style={styles.navBtnNext}
                        onPress={handleNextQuestion}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.navBtnNextText}>Next →</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.submitExamBtn}
                      onPress={handleSubmitExam}
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.submitExamText}>Submit Assessment ✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  Loading assessment questions...
                </Text>
              </View>
            )
          )}
        </GlassCard>
      )}

      {/* ============================================================== */}
      {/* 3. STUDENT ASSESSMENT LISTING VIEW                             */}
      {/* ============================================================== */}
      {!activeQuiz && (
        <View>
          {/* Navigation Category Tabs */}
          <View style={styles.filterBar}>
            <View style={styles.tabsRow}>
              {[
                { id: 'all', label: `All Assessments (${quizzes.length})` },
                { id: 'available', label: `Active / Available (${availableCount})`, icon: '🟢' },
                { id: 'upcoming', label: `Upcoming (${upcomingCount})`, icon: '⏳' },
                { id: 'completed', label: `Completed (${completedCount})`, icon: '🏆' }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterTab, activeTab === tab.id && styles.filterTabActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, activeTab === tab.id && styles.filterTabTextActive]}>
                    {tab.icon ? `${tab.icon} ` : ''}{tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Staff Filters */}
            {isStaff && (
              <View style={styles.staffFilterRow}>
                <View style={styles.filterDropdownGroup}>
                  <Text style={styles.filterLabel}>Dept:</Text>
                  <select
                    style={webSelectStyle}
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    <option value="CS">Computer Science (CS)</option>
                    <option value="EC">Electronics (EC)</option>
                    <option value="ME">Mechanical (ME)</option>
                  </select>
                </View>

                <View style={styles.filterDropdownGroup}>
                  <Text style={styles.filterLabel}>Semester:</Text>
                  <select
                    style={webSelectStyle}
                    value={semFilter}
                    onChange={(e) => setSemFilter(e.target.value)}
                  >
                    <option value="all">All Semesters</option>
                    <option value="1">Semester 1 (S1)</option>
                    <option value="2">Semester 2 (S2)</option>
                    <option value="3">Semester 3 (S3)</option>
                    <option value="4">Semester 4 (S4)</option>
                    <option value="5">Semester 5 (S5)</option>
                    <option value="6">Semester 6 (S6)</option>
                  </select>
                </View>
              </View>
            )}
          </View>

          {/* Assessment Cards Grid */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading assessments...</Text>
            </View>
          ) : filteredQuizzes.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📝</Text>
              <Text style={styles.emptyTitle}>No assessments found in this view</Text>
              <Text style={styles.emptySub}>
                {activeTab !== 'all' ? 'Try switching filter tabs or check back later.' : 'No assessments scheduled.'}
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.quizList}>
              {filteredQuizzes.map(quiz => {
                const isCompleted = quiz.category === 'completed';
                const isUpcoming = quiz.category === 'upcoming';
                const isAvailable = quiz.category === 'available';

                return (
                  <GlassCard key={quiz.id} style={styles.quizCard}>
                    <View style={styles.quizTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={styles.quizTitle}>{quiz.title}</Text>
                          {quiz.subject_code && (
                            <Badge label={quiz.subject_code} variant="cyan" />
                          )}
                          <Badge
                            label={isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Available Now'}
                            variant={isCompleted ? 'success' : isUpcoming ? 'amber' : 'primary'}
                          />
                          {quiz.has_passed && <Badge label="Passed ✓" variant="success" />}
                        </View>
                        <Text style={styles.quizSubTitle}>{quiz.course_title}</Text>
                        <Text style={styles.quizMeta}>
                          ⏱ {quiz.time_limit || quiz.time_limit_minutes || 20} Mins • 🏆 {quiz.total_marks || 50} Marks • ❓ {quiz.total_questions || 10} Questions • Pass: {quiz.pass_percentage || 60}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.quizDesc}>{quiz.instructions || quiz.description}</Text>

                    <View style={styles.quizBottom}>
                      <View style={styles.attemptHistory}>
                        <Text style={styles.attemptText}>
                          Attempts Used: {quiz.my_attempts_count || 0} / {quiz.max_attempts || 10}
                        </Text>
                        {quiz.best_score !== null && (
                          <Text style={styles.bestScoreText}>
                            Best Score: {quiz.best_score}% ({quiz.has_passed ? 'Passed ✓' : 'Needs Retake'})
                          </Text>
                        )}
                      </View>

                      {/* Dynamic Action Button */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isStaff && (
                          <>
                            <TouchableOpacity
                              style={styles.staffEditBtn}
                              onPress={() => handleOpenEditQuiz(quiz)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.staffEditBtnText}>✏️ Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.staffDeleteBtn}
                              onPress={() => handleDeleteQuiz(quiz.id, quiz.title)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.staffDeleteBtnText}>🗑️ Delete</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {isCompleted ? (
                          <TouchableOpacity
                            style={styles.retakeActionBtn}
                            onPress={() => handleRetakeQuiz(quiz.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.retakeActionBtnText}>🔄 Retake Assessment</Text>
                          </TouchableOpacity>
                        ) : isUpcoming ? (
                          <View style={styles.upcomingBadgePill}>
                            <Text style={styles.upcomingBadgeText}>
                              🔒 Opens {quiz.available_from ? new Date(quiz.available_from).toLocaleDateString() : 'Soon'}
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.startBtn}
                            onPress={() => handleStartQuiz(quiz.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.startBtnText}>▶ Start Assessment</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Create Assessment Modal (Staff) */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Examination Quiz"
      >
        <View style={styles.modalBody}>
          <Text style={styles.label}>Quiz Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Distributed Systems Midterm Certification"
            placeholderTextColor={colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <Text style={styles.label}>Time Limit (Minutes)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={newTimeLimit}
            onChangeText={setNewTimeLimit}
          />
          <Text style={styles.label}>Passing Percentage (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={newPassingPct}
            onChangeText={setNewPassingPct}
          />
          <Text style={styles.label}>Instructions for Candidates</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            placeholder="Exam regulations, requirements, and policies..."
            placeholderTextColor={colors.textMuted}
            value={newInstructions}
            onChangeText={setNewInstructions}
          />
          <TouchableOpacity style={styles.createSubmitBtn} onPress={handleCreateQuiz}>
            <Text style={styles.createSubmitText}>Publish Assessment</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Assessment Modal (Staff) */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Examination Assessment"
      >
        <View style={styles.modalBody}>
          <Text style={styles.label}>Quiz Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Assessment Title"
            placeholderTextColor={colors.textMuted}
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Time Limit (Mins)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editTimeLimit}
                onChangeText={setEditTimeLimit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Passing Score (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editPassingPct}
                onChangeText={setEditPassingPct}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Max Attempts</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editMaxAttempts}
                onChangeText={setEditMaxAttempts}
              />
            </View>
          </View>

          <Text style={styles.label}>Instructions for Candidates</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            placeholder="Exam regulations, requirements, and policies..."
            placeholderTextColor={colors.textMuted}
            value={editInstructions}
            onChangeText={setEditInstructions}
          />

          <TouchableOpacity
            style={[styles.createSubmitBtn, savingEdit && { opacity: 0.7 }]}
            onPress={handleSaveEditQuiz}
            disabled={savingEdit}
          >
            {savingEdit ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.createSubmitText}>✓ Save & Update Assessment</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    padding: 24
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold
  },
  cohortBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  cohortBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 4,
    maxWidth: 700
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  staffFilterRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  filterDropdownGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },

  // Active Quiz Card
  examCard: {
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6366F1',
    padding: 24,
    boxShadow: '0 0 25px rgba(99, 102, 241, 0.25)'
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16
  },
  examTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold
  },
  examInstructions: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    maxWidth: 600
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 10
  },
  timerUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)'
  },
  timerIcon: {
    fontSize: 20
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  timerText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  expiredBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentRose,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  expiredBannerTitle: {
    color: colors.accentRose,
    fontWeight: 'bold',
    fontSize: 13
  },
  expiredBannerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },

  // Step-by-step Player
  playerWrapper: {
    gap: 16
  },
  navPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgDark,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  navPillsLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold'
  },
  navPill: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navPillAnswered: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981'
  },
  navPillCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.25)'
  },
  navPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  navPillTextAnswered: {
    color: '#10B981'
  },
  navPillTextCurrent: {
    color: '#FFF'
  },

  // Question Card
  questionCard: {
    backgroundColor: colors.bgSurface,
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  qNumber: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  qText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: typography.weight.bold,
    lineHeight: 24,
    marginBottom: 20
  },
  optionsList: {
    gap: 12
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  optSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: colors.primary,
    boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioActive: {
    borderColor: colors.primary
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  optLetterBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  optLetterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold'
  },
  optLetterTextActive: {
    color: colors.primaryLight
  },
  optText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20
  },
  optTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold
  },

  // Player Action Bar
  playerActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 12
  },
  navBtn: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  navBtnDisabled: {
    opacity: 0.4
  },
  navBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  navBtnTextDisabled: {
    color: colors.textMuted
  },
  navBtnNext: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  navBtnNextText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  answerProgressIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.bgDark
  },
  answerProgressText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  submitExamBtn: {
    backgroundColor: colors.accentEmerald,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center'
  },
  submitExamText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },

  // Results View Styles
  resultBanner: {
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  resPassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10B981'
  },
  resFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: colors.danger
  },
  resScore: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  resFeedback: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 500
  },
  resultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  retakeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  retakeBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  closeExamBtn: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  closeExamBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold'
  },

  breakdownWrap: {
    width: '100%',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 18,
    gap: 12
  },
  breakdownHeading: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    marginBottom: 4
  },
  breakdownItem: {
    backgroundColor: colors.bgDark,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  breakdownTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  breakdownQNum: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    flex: 1
  },
  breakdownExpText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6
  },

  // Assessment Listing Card
  quizList: {
    gap: 16
  },
  quizCard: {
    padding: 20
  },
  quizTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  quizTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weight.bold
  },
  quizSubTitle: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    marginTop: 3
  },
  quizMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6
  },
  quizDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    marginVertical: 12,
    lineHeight: 18
  },
  quizBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 14,
    flexWrap: 'wrap',
    gap: 10
  },
  attemptHistory: {
    gap: 2
  },
  attemptText: {
    color: colors.textMuted,
    fontSize: 12
  },
  bestScoreText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: 'bold'
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: typography.weight.bold,
    fontSize: 13
  },
  retakeActionBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8
  },
  retakeActionBtnText: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold,
    fontSize: 13
  },
  upcomingBadgePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  upcomingBadgeText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },

  centerBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center'
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weight.bold
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },

  modalBody: {
    gap: 12
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 14
  },
  createSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  createSubmitText: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  staffEditBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8
  },
  staffEditBtnText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  staffDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8
  },
  staffDeleteBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: typography.weight.bold
  }
});
