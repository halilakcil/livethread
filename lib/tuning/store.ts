import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TuningCategory {
  id: string;
  name: string;
  description: string;
  threshold: number; // 0 - 100
  minLikes: number;
  enabled: boolean;
  tags: string[];
}

export const DEFAULT_CATEGORIES: TuningCategory[] = [
  {
    id: "bilim",
    name: "Bilim",
    description: "Bilimsel araştırmalar, keşifler, doğa kanunları, evren ve bilimsel yöntem hakkında bilgilendirici içerikler.",
    threshold: 70,
    minLikes: 10,
    enabled: true,
    tags: ["bilim", "science", "bilimsel", "arastirma"],
  },
  {
    id: "fizik",
    name: "Fizik",
    description: "Klasik mekanik, astrofizik, kozmoloji, görelilik teorisi, termodinamik ve evrenin temel kuralları.",
    threshold: 75,
    minLikes: 10,
    enabled: true,
    tags: ["fizik", "physics", "astrofizik", "uzay"],
  },
  {
    id: "kuantum",
    name: "Kuantum",
    description: "Kuantum mekaniği, kuantum dolanıklık, süperpozisyon, kuantum bilgisayarları ve parçacık fiziği.",
    threshold: 80,
    minLikes: 15,
    enabled: true,
    tags: ["kuantum", "quantum", "parcacikfizigi"],
  },
  {
    id: "simulasyon",
    name: "Simülasyon Teorisi",
    description: "Simüle evren hipotezi, holografik evren, Bostrom argümanı, dijital fizik ve gerçekliğin doğası.",
    threshold: 75,
    minLikes: 10,
    enabled: true,
    tags: ["simulasyon", "simulationtheory", "matriks"],
  },
  {
    id: "unlu_yasalar",
    name: "Ünlü Yasalar & Paradokslar",
    description: "Fermi Paradoksu, Murphy Kanunları, Moore Yasası, Schrödinger kedisi, Dunning-Kruger ve ünlü düşünce deneyleri.",
    threshold: 70,
    minLikes: 10,
    enabled: true,
    tags: ["paradoks", "fermiparadox", "kanunlar", "felsefe"],
  },
  {
    id: "politika",
    name: "Politika & Jeopolitik",
    description: "Uluslararası ilişkiler, diplomasi, jeopolitik güç dengeleri, kamu politikaları ve siyaset bilimi.",
    threshold: 65,
    minLikes: 15,
    enabled: true,
    tags: ["politika", "siyaset", "jeopolitik", "diplomasi"],
  },
  {
    id: "futbol",
    name: "Futbol & Taktik Analiz",
    description: "Futbol taktikleri, saha içi dizilişler, analitik veriler, oyuncu rolleri ve derinlemesine spor analizleri.",
    threshold: 65,
    minLikes: 15,
    enabled: true,
    tags: ["futbol", "football", "taktik", "analiz"],
  },
  {
    id: "felsefe",
    name: "Felsefe & Düşünce",
    description: "Varoluşçuluk, stoacılık, epistemoloji, ahlak felsefesi, mantık ve tarihsel düşünürlerin fikirleri.",
    threshold: 75,
    minLikes: 10,
    enabled: true,
    tags: ["felsefe", "philosophy", "stoacilik", "dusunce"],
  },
  {
    id: "yapayzeka",
    name: "Yapay Zeka & Teknoloji",
    description: "Büyük dil modelleri (LLM), yapay zeka ajanları, makine öğrenimi, nöral ağlar ve teknolojik kırılmalar.",
    threshold: 70,
    minLikes: 15,
    enabled: true,
    tags: ["yapayzeka", "ai", "machinelearning", "llm"],
  },
  {
    id: "girisimcilik",
    name: "Girişimcilik & Startup",
    description: "Ürün geliştirme, SaaS, girişim büyümesi, gelir modelleri, fonlama ve iş kurma stratejileri.",
    threshold: 65,
    minLikes: 10,
    enabled: true,
    tags: ["startup", "girisimcilik", "saas", "isdunyasi"],
  },
  {
    id: "psikoloji",
    name: "Psikoloji & Bilişsel Bilim",
    description: "Bilişsel yanlılıklar, nörobilim, karar alma mekanizmaları, alışkanlıklar ve insan davranışı.",
    threshold: 70,
    minLikes: 10,
    enabled: true,
    tags: ["psikoloji", "norobilim", "davranis", "zihin"],
  },
];

export interface TuningState {
  categories: TuningCategory[];
  activeCategoryId: string;
  globalAiFilterEnabled: boolean;
  setCategoryThreshold: (id: string, threshold: number) => void;
  setCategoryMinLikes: (id: string, minLikes: number) => void;
  toggleCategory: (id: string, enabled?: boolean) => void;
  updateCategory: (id: string, updates: Partial<TuningCategory>) => void;
  addCategory: (category: Omit<TuningCategory, "id">) => void;
  removeCategory: (id: string) => void;
  setActiveCategory: (id: string) => void;
  setGlobalAiFilter: (enabled: boolean) => void;
  resetDefaults: () => void;
}

export const useTuning = create<TuningState>()(
  persist(
    (set) => ({
      categories: DEFAULT_CATEGORIES,
      activeCategoryId: "bilim",
      globalAiFilterEnabled: true,

      setCategoryThreshold: (id, threshold) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, threshold: Math.min(100, Math.max(0, threshold)) } : c
          ),
        })),

      setCategoryMinLikes: (id, minLikes) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, minLikes: Math.max(0, minLikes) } : c
          ),
        })),

      toggleCategory: (id, enabled) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, enabled: enabled !== undefined ? enabled : !c.enabled } : c
          ),
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      addCategory: (category) =>
        set((state) => {
          const id =
            category.name.toLowerCase().replace(/[^a-z0-9]/g, "_") ||
            `cat_${Date.now()}`;
          return {
            categories: [...state.categories, { ...category, id }],
          };
        }),

      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      setActiveCategory: (id) => set({ activeCategoryId: id }),

      setGlobalAiFilter: (enabled) => set({ globalAiFilterEnabled: enabled }),

      resetDefaults: () =>
        set({
          categories: DEFAULT_CATEGORIES,
          activeCategoryId: "bilim",
          globalAiFilterEnabled: true,
        }),
    }),
    {
      name: "livethread.tuning",
    }
  )
);
