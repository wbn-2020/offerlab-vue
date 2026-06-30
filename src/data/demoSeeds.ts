import type {
  CompanyPrep,
  Question,
  UserKnowledge,
  UserPrepOverview,
  UserWeeklyPrepReport,
} from '@/api/question'
import type { InterviewMaterialPack } from '@/api/post'
import type { GrowthProfile, GrowthReport, PaginatedResponse, Post, Tag, User } from '@/api/types'
import type { ContributionSummary } from '@/utils/communityMetrics'

const now = Date.now()
const day = 24 * 60 * 60 * 1000

const demoAuthor: User = {
  uid: 'demo-author-001',
  nickname: 'OfferLab Demo',
  avatar: '',
  signature: '用真实项目复盘沉淀可复用的面试素材。',
  createdAt: now - 180 * day,
  followerCount: 328,
  followingCount: 42,
  postCount: 18,
  isBigV: true,
}

const tags = {
  redis: { id: 'tag-redis', name: 'Redis', slug: 'redis', category: 'backend', count: 42 },
  kafka: { id: 'tag-kafka', name: 'Kafka', slug: 'kafka', category: 'backend', count: 31 },
  systemDesign: { id: 'tag-system-design', name: '系统设计', slug: 'system-design', category: 'architecture', count: 28 },
  interview: { id: 'tag-interview', name: '面试复盘', slug: 'interview-review', category: 'career', count: 24 },
  java: { id: 'tag-java', name: 'Java 后端', slug: 'java-backend', category: 'backend', count: 37 },
} satisfies Record<string, Tag>

const post = (id: string, postType: number, title: string, summary: string, tagList: Tag[]): Post => ({
  postId: id,
  postType,
  title,
  content: `${title}\n\n${summary}`,
  summary,
  tags: tagList,
  author: demoAuthor,
  counter: { view: 1280, like: 96, comment: 18, favorite: 54 },
  domain: 1,
  recommendationReasons: ['demo seed', '冷启动示例'],
  myInteraction: { liked: false, favorited: true },
  createdAt: now - 12 * day,
  updatedAt: now - 2 * day,
})

export const demoPosts: Post[] = [
  post(
    'demo-post-coupon-stock',
    1,
    '高并发优惠券库存扣减复盘',
    '从 Redis 预扣、MySQL 最终一致和 MQ 补偿三个层面复盘一次秒杀库存治理。',
    [tags.redis, tags.kafka, tags.systemDesign],
  ),
  post(
    'demo-post-kafka-review',
    2,
    'Kafka 消息堆积面试复盘',
    '把排障过程拆成监控信号、消费瓶颈、扩容策略和复盘行动，适合系统设计追问。',
    [tags.kafka, tags.interview, tags.java],
  ),
]

export const demoQuestions: Question[] = [
  {
    id: 'demo-question-redis-hot-key',
    questionText: 'Redis 热 key 如何治理？请结合一次线上读流量突增的排查过程回答。',
    answerHint: '先定位热 key，再拆读写链路、缓存副本、本地缓存、限流与降级。',
    examPoint: '缓存治理、容量评估、故障复盘',
    referenceAnswer: '可以从监控发现、热点隔离、多级缓存、过期策略和回滚预案展开。',
    company: '字节跳动',
    position: 'Java 后端',
    interviewRound: '二面',
    difficulty: 'medium',
    confidence: 0.86,
    sourcePostId: 'demo-post-coupon-stock',
    sourceAuthorUid: demoAuthor.uid,
    appearCount: 7,
    qualityScore: 92,
    tags: [tags.redis, tags.systemDesign],
    favorite: true,
    progressStatus: 'review',
    note: '回答时补上监控指标和容量测算，不要只讲缓存方案。',
    mistakeReason: 'project',
    answerDraft: 'S: 大促前读流量集中到库存详情页；T: 保证库存查询稳定且不击穿 DB；A: 拆分热点 key、本地缓存兜底、MQ 异步刷新、限流降级；R: 峰值 RT 稳定在 80ms 内。',
    starStory: '用一次优惠券库存系统治理说明从发现问题到复盘改进的闭环。',
    nextReviewAt: now + day,
    lastReviewedAt: now - 2 * day,
    reviewCount: 3,
    reviewIntervalDays: 3,
    sourcePostCount: 2,
    createdAt: now - 15 * day,
    updatedAt: now - day,
  },
  {
    id: 'demo-question-kafka-lag',
    questionText: 'Kafka 消息堆积时，你会如何判断是生产端、Broker 还是消费端问题？',
    answerHint: '按 lag、生产速率、消费 TPS、rebalance、批处理耗时和下游依赖逐层排查。',
    examPoint: '消息队列可靠性、可观测性、容量扩展',
    referenceAnswer: '先用监控判断堆积范围，再分析消费者耗时和分区并行度，最后给出扩容与削峰方案。',
    company: '腾讯',
    position: '后端开发',
    interviewRound: '系统设计',
    difficulty: 'hard',
    confidence: 0.81,
    sourcePostId: 'demo-post-kafka-review',
    sourceAuthorUid: demoAuthor.uid,
    appearCount: 5,
    qualityScore: 89,
    tags: [tags.kafka, tags.systemDesign],
    favorite: false,
    progressStatus: 'learning',
    note: '准备一段真实排障时间线。',
    mistakeReason: 'concept',
    answerDraft: '先确认是否全 topic 堆积，再看消费者组 lag、rebalance 日志、批处理耗时和下游 DB 写入瓶颈。',
    nextReviewAt: now + 2 * day,
    lastReviewedAt: now - day,
    reviewCount: 2,
    reviewIntervalDays: 2,
    sourcePostCount: 1,
    createdAt: now - 10 * day,
    updatedAt: now - day,
  },
  {
    id: 'demo-question-idempotency',
    questionText: '支付回调或优惠券发放接口如何设计幂等？',
    answerHint: '幂等键、唯一约束、状态机、重试语义和对账补偿。',
    examPoint: '分布式事务、接口设计、异常补偿',
    company: '美团',
    position: '服务端工程师',
    interviewRound: '一面',
    difficulty: 'medium',
    confidence: 0.84,
    appearCount: 4,
    qualityScore: 88,
    tags: [tags.java, tags.systemDesign],
    favorite: true,
    progressStatus: 'todo',
    reviewCount: 0,
    reviewIntervalDays: 1,
    sourcePostCount: 1,
    createdAt: now - 8 * day,
    updatedAt: now - 2 * day,
  },
]

const pageOf = <T>(items: T[], total = items.length): PaginatedResponse<T> => ({
  items,
  hasMore: false,
  total,
  source: 'local_demo_seed',
  degraded: true,
  fallbackReason: 'demo_seed',
})

const includes = (value: string | undefined, query: string | undefined) => (
  !query || String(value || '').toLowerCase().includes(query.toLowerCase())
)

export const demoQuestionPage = (params: {
  keyword?: string
  company?: string
  position?: string
  difficulty?: string
  progressStatus?: string
  mistakeReason?: string
  hasNote?: boolean
  hasAnswerDraft?: boolean
  hasStarStory?: boolean
} = {}): PaginatedResponse<Question> => {
  const keyword = params.keyword?.trim().toLowerCase()
  const items = demoQuestions.filter((item) => {
    const keywordHit = !keyword || [
      item.questionText,
      item.answerHint,
      item.examPoint,
      item.company,
      item.position,
      ...item.tags.map((tag) => tag.name),
    ].some((value) => String(value || '').toLowerCase().includes(keyword))
    return keywordHit
      && includes(item.company, params.company)
      && includes(item.position, params.position)
      && (!params.difficulty || item.difficulty === params.difficulty)
      && (!params.progressStatus || item.progressStatus === params.progressStatus)
      && (!params.mistakeReason || params.mistakeReason === 'any' || item.mistakeReason === params.mistakeReason)
      && (!params.hasNote || Boolean(item.note))
      && (!params.hasAnswerDraft || Boolean(item.answerDraft))
      && (!params.hasStarStory || Boolean(item.starStory))
  })
  return pageOf(items)
}

export const demoCompanyPrep = (company = '字节跳动'): CompanyPrep => ({
  company: company || '字节跳动',
  aliases: [company || '字节跳动', 'ByteDance', '抖音电商'],
  relatedPositionCount: 3,
  recentPosts: demoPosts,
  topQuestions: demoQuestions,
  recommendedQuestions: demoQuestions.slice(0, 2),
  topTags: [
    { name: 'Redis', count: 8 },
    { name: 'Kafka', count: 6 },
    { name: '系统设计', count: 5 },
  ],
  hotPositions: [
    { name: 'Java 后端', count: 9 },
    { name: '服务端工程师', count: 6 },
  ],
  trend30Days: [
    { name: '近 30 天经验帖', count: 12 },
    { name: '近 30 天面试复盘', count: 7 },
  ],
  trend90Days: [
    { name: '近 90 天经验帖', count: 34 },
    { name: '近 90 天面试复盘', count: 18 },
  ],
  interviewResultDistribution: [
    { name: '通过', count: 8 },
    { name: '待补强', count: 4 },
  ],
  recentResultDistribution: [
    { name: '通过', count: 3 },
    { name: '待补强', count: 2 },
  ],
  questionSampleCount: demoQuestions.length,
  postSampleCount: demoPosts.length,
  resultSampleCount: 12,
  recentResultSampleCount: 5,
  dataUpdatedAt: now,
  prepScore: 76,
  checklist: [
    { key: 'read-review', title: '读 2 篇面试复盘', description: '先了解近期高频追问和项目表达方式。', done: true, current: 2, target: 2, actionHref: '/search?q=面试复盘' },
    { key: 'practice-system', title: '练 3 道系统设计题', description: '围绕缓存、消息队列和幂等整理回答卡片。', done: false, current: 1, target: 3, actionHref: '/questions?company=字节跳动' },
  ],
  nextActions: ['收藏 2 道系统设计题', '把优惠券库存复盘整理成 STAR 素材', '完成一次 Kafka 专项知识复盘'],
  myProgress: {
    favoriteCount: 2,
    learningCount: 1,
    masteredCount: 1,
    reviewCount: 1,
  },
})

const demoMaterialPack: InterviewMaterialPack = {
  id: 'demo-material-coupon-stock',
  uid: 'demo-user',
  postId: 'demo-post-coupon-stock',
  generationStatus: 'SUCCEEDED',
  starSituation: '大促前优惠券库存读写流量集中，库存一致性和查询稳定性同时承压。',
  starTask: '在不影响发券链路的前提下，降低 DB 压力并保留异常补偿能力。',
  starAction: '引入 Redis 预扣、Kafka 异步确认、幂等状态机和对账补偿任务。',
  starResult: '峰值期间核心接口稳定，异常库存通过补偿任务自动修复。',
  resumeBullets: ['负责优惠券库存扣减链路稳定性治理，设计 Redis 预扣与 MQ 补偿方案。'],
  followUpQuestions: ['如何证明没有超发？', '补偿任务失败时怎么告警？'],
  technicalHighlights: ['Redis 热 key 治理', 'Kafka 补偿链路', '幂等状态机'],
  missingHints: ['补充压测数据', '补充告警阈值'],
  savedToPrep: true,
  provider: 'local_demo_seed',
  fallbackUsed: true,
  sourcePost: demoPosts[0],
  createTime: now - 4 * day,
  updateTime: now - day,
}

export const demoUserKnowledge: UserKnowledge = {
  materialPackCount: 2,
  savedMaterialPackCount: 1,
  favoritePostCount: demoPosts.length,
  favoriteQuestionCount: 2,
  materialPacks: [demoMaterialPack],
  favoritePosts: demoPosts,
  favoriteQuestions: demoQuestions.filter((item) => item.favorite),
  targets: [
    { id: 'demo-target-bytedance', uid: 'demo-user', targetType: 'company', targetValue: '字节跳动', priority: 'high', note: '后端系统设计与项目复盘', createTime: new Date(now - 9 * day).toISOString() },
  ],
  weakTags: [
    { name: '系统设计', count: 3 },
    { name: 'Kafka', count: 2 },
  ],
  materialGapHints: ['补一段压测数据', '把 Kafka 堆积排障整理成 STAR', '准备 Redis 热 key 兜底方案图'],
}

export const demoUserPrepOverview: UserPrepOverview = {
  favoriteCount: 2,
  todoCount: 1,
  learningCount: 1,
  masteredCount: 1,
  reviewCount: 1,
  noteCount: 2,
  answerDraftCount: 2,
  targets: demoUserKnowledge.targets,
  favoriteQuestions: demoUserKnowledge.favoriteQuestions,
  reviewQuestions: [demoQuestions[0]],
  answerDraftQuestions: demoQuestions.filter((item) => item.answerDraft),
  recommendedQuestions: demoQuestions,
  targetSummaries: [
    {
      target: demoUserKnowledge.targets[0],
      questionCount: 3,
      favoriteCount: 2,
      learningCount: 1,
      masteredCount: 1,
      reviewCount: 1,
      recommendedQuestions: demoQuestions.slice(0, 2),
    },
  ],
  mistakeReasonCounts: [
    { reason: 'project', count: 1 },
    { reason: 'concept', count: 1 },
  ],
  focusTagCounts: demoUserKnowledge.weakTags,
  reviewPlan: {
    todayCount: 1,
    weekTouchedCount: 4,
    todayQuestions: [demoQuestions[0]],
    weekTouchedQuestions: demoQuestions.slice(0, 2),
  },
}

export const demoWeeklyPrepReport: UserWeeklyPrepReport = {
  windowStart: now - 7 * day,
  windowEnd: now,
  touchedQuestionCount: 6,
  masteredQuestionCount: 1,
  reviewQuestionCount: 2,
  noteCount: 3,
  answerDraftCount: 2,
  mockSessionCount: 2,
  mockCompletedCount: 1,
  mockAnsweredQuestionCount: 5,
  mockAverageScorePercent: 78,
  mockBestScorePercent: 86,
  mistakeReasonCounts: demoUserPrepOverview.mistakeReasonCounts,
  focusTagCounts: demoUserPrepOverview.focusTagCounts,
  touchedQuestions: demoQuestions,
  nextActions: ['复盘 Redis 热 key 题', '补齐 Kafka 堆积排障时间线', '把优惠券项目整理成 2 分钟版本'],
}

export const demoGrowthProfile: GrowthProfile = {
  days: 30,
  degraded: true,
  degradationReasons: ['local_demo_seed'],
  strongestDomain: '后端工程',
  emergingDomain: '系统设计',
  nextFocus: '成长档案 demo：继续发布技术经验帖和面试复盘，系统会自动聚合你的成长轨迹。',
  domains: [
    {
      domain: 1,
      domainName: '后端工程',
      postCount: 2,
      seriesCount: 1,
      activeDays: 5,
      interactionCount: 168,
      viewCount: 2480,
      dimensions: [
        { key: 'depth', label: '技术深度', score: 82, explanation: '能把 Redis、Kafka 和幂等设计串成完整链路。' },
        { key: 'review', label: '复盘完整度', score: 76, explanation: '已经包含问题、行动和结果，可继续补充量化指标。' },
      ],
      representativePosts: demoPosts.map((item) => ({
        postId: item.postId,
        title: item.title,
        domain: item.domain,
        heat: item.counter.view + item.counter.like * 5,
        featured: true,
      })),
    },
  ],
}

export const demoGrowthReport: GrowthReport = {
  period: 'weekly',
  days: 7,
  degraded: true,
  degradationReasons: ['local_demo_seed'],
  publishedPostCount: 2,
  interactionCount: 168,
  featuredPostCount: 1,
  seriesContributionCount: 1,
  domainChanges: [
    { domain: 1, domainName: '后端工程', currentPostCount: 2, previousPostCount: 0, trend: 'up', reason: '新增技术经验帖和面试复盘各 1 篇。' },
  ],
  highlightPosts: demoPosts.map((item) => ({
    postId: item.postId,
    title: item.title,
    domain: item.domain,
    domainName: '后端工程',
    interactionCount: item.counter.like + item.counter.comment + item.counter.favorite,
    featured: item.postId === 'demo-post-coupon-stock',
  })),
  nextActions: ['补充一次压测数据', '把 Kafka 堆积复盘改写成 STAR 素材', '为字节跳动后端备考包补 3 道题'],
}

export const demoProfileContribution: ContributionSummary = {
  level: 'L2',
  badge: '成长档案 demo',
  score: 168,
  postCount: 2,
  featuredCount: 1,
  viewCount: 2480,
  likeCount: 96,
  favoriteCount: 54,
  commentCount: 18,
  source: 'local_demo_seed',
  estimated: true,
}

export const demoPostPage = (): PaginatedResponse<Post> => pageOf(demoPosts)
