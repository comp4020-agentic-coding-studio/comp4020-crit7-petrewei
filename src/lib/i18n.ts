// The page's words in English and Simplified Chinese. Codes are never
// translated: course and activity codes, group labels, times, dates, the
// rooms and lecturers as MyTimetable names them, and the tutorial groups'
// names and tutors.
export type Locale = "en" | "zh";

// The English course titles come from the MyTimetable copy; these are keyed by
// its course codes, and spec/i18n.test.ts checks every course has one.
export const COURSE_TITLES_ZH: Record<string, string> = {
  COMP3300: "操作系统实现",
  COMP3500: "计算机团队项目",
  COMP4020: "以人为本的智能体编程工作室高级专题",
};

// Activity kinds and meeting types, as the MyTimetable copy spells them. The
// kind "Computer lab" reads "Lab" and the meeting type "Computer Laboratory"
// reads "Laboratory" in English too.
const TERMS_EN: Record<string, string> = { "Computer lab": "Lab", "Computer Laboratory": "Laboratory" };
const TERMS_ZH: Record<string, string> = {
  Lecture: "讲座",
  "Computer lab": "实验课",
  "Computer Laboratory": "实验课",
  Tutorial: "辅导课",
  "Tutorial Makeup": "辅导补课",
};

const WEEKDAYS_ZH: Record<string, string> = { Mon: "周一", Tue: "周二", Wed: "周三", Thu: "周四", Fri: "周五" };

// What a week-calendar entry is: a lab or tutorial group, or a lecture.
export type EntryName = { courseCode: string; kind: string; code: string; group: string | null };

const en = {
  lang: "en-AU",
  prefix: "",
  siteTitle: "ANU Timetable",
  siteNav: "site",
  timetable: "Timetable",
  about: "About",
  otherLanguage: "中文",
  heading: "Second Semester 2026",
  lede: "Your lab and tutorial groups, and your classes one week at a time; clashes are marked red in the week.",
  courseTitle: (_code: string, title: string) => title,
  term: (term: string) => TERMS_EN[term] ?? term,
  day: (day: string) => day,
  group: (label: string) => `Group ${label}`,
  tutor: (name: string) => `Tutor: ${name}`,
  allocate: "Allocate",
  allocated: "Allocated",
  allocateLabel: (label: string) => `Allocate group ${label}`,
  allocatedLabel: (label: string) => `Group ${label} is allocated`,
  free: (free: number) => (free === 0 ? "Full" : `${free} ${free === 1 ? "place" : "places"} free`),
  oneOff: (date: string) => `${date} only`,
  makeupAt: (when: string) => `${when}, `,
  details: "Details",
  yourWeek: "Your week",
  weekIntro:
    'Your lectures and allocated tutorial and lab groups, on the dates they meet. A meeting marked "clash" overlaps another on the same date.',
  weeksNav: "weeks",
  previousWeek: "Previous week",
  nextWeek: "Next week",
  chooseWeek: "Choose a week",
  showWeek: "Show",
  weekRange: (n: number, from: string, to: string) => `Week ${n}: ${from} to ${to}`,
  nothingOn: "Nothing on",
  clash: "clash",
  entry: ({ courseCode, kind, code, group }: EntryName) =>
    group ? `${courseCode} ${en.term(kind)} group ${group}` : `${courseCode} ${en.term(kind)} (${code})`,
};

const zh: typeof en = {
  lang: "zh-CN",
  prefix: "/zh",
  siteTitle: "ANU 课表",
  siteNav: "网站",
  timetable: "课表",
  about: "关于",
  otherLanguage: "English",
  heading: "2026 年第二学期",
  lede: "你的实验课和辅导课分组，以及按周排列的课程；冲突在周视图中以红色标出。",
  courseTitle: (code, title) => COURSE_TITLES_ZH[code] ?? title,
  term: (term) => TERMS_ZH[term] ?? term,
  day: (day) => WEEKDAYS_ZH[day] ?? day,
  group: (label) => `小组 ${label}`,
  tutor: (name) => `助教：${name}`,
  allocate: "分配",
  allocated: "已分配",
  allocateLabel: (label) => `分配小组 ${label}`,
  allocatedLabel: (label) => `小组 ${label} 已分配`,
  free: (free) => (free === 0 ? "已满" : `剩余 ${free} 个名额`),
  oneOff: (date) => `仅 ${date}`,
  makeupAt: (when) => `${when}，`,
  details: "详情",
  yourWeek: "你的一周",
  weekIntro: "你的讲座和已分配的辅导课与实验课分组，按上课日期排列。标有“冲突”的课程与同一天的另一门课程时间重叠。",
  weeksNav: "周次",
  previousWeek: "上一周",
  nextWeek: "下一周",
  chooseWeek: "选择周次",
  showWeek: "显示",
  weekRange: (n, from, to) => `第 ${n} 周：${from} 至 ${to}`,
  nothingOn: "无课",
  clash: "冲突",
  entry: ({ courseCode, kind, code, group }) =>
    group ? `${courseCode} ${zh.term(kind)} 小组 ${group}` : `${courseCode} ${zh.term(kind)}（${code}）`,
};

export const STRINGS: Record<Locale, typeof en> = { en, zh };

// The same page in the other language, keeping the query string, so the
// week on screen stays on screen.
export const counterpart = (url: URL, locale: Locale): string => {
  const path = locale === "zh" ? url.pathname.replace(/^\/zh(?=\/)/, "") : `/zh${url.pathname}`;
  return path + url.search;
};
