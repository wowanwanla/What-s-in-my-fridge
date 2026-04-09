/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  ChefHat, 
  Utensils, 
  Clock, 
  CheckCircle2,
  X,
  BookOpen,
  Loader2
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";

// --- Types ---
type Category = "Vegetables" | "Meat & Seafood" | "Dairy & Eggs" | "Pantry/Condiments";
type Tag = "Main Course" | "Appetizer" | "Snack" | "Dessert";

interface Ingredient {
  id: string;
  name: string;
  category: Category;
  icon: string;
}

interface Recipe {
  id: string;
  title: string;
  tag: Tag;
  matchPercentage: number;
  image: string;
  time: string;
  ingredients: string[];
  missedIngredients?: string[];
}

// --- Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const SPOONACULAR_API_KEY = process.env.VITE_SPOONACULAR_API_KEY || "";

// --- Mock Data (Fallback & Categories) ---
const INGREDIENTS: Ingredient[] = [
  { id: "1", name: "Tomato", category: "Vegetables", icon: "🍅" },
  { id: "2", name: "Onion", category: "Vegetables", icon: "🧅" },
  { id: "3", name: "Garlic", category: "Vegetables", icon: "🧄" },
  { id: "4", name: "Spinach", category: "Vegetables", icon: "🥬" },
  { id: "5", name: "Potato", category: "Vegetables", icon: "🥔" },
  { id: "6", name: "Carrot", category: "Vegetables", icon: "🥕" },
  { id: "7", name: "Broccoli", category: "Vegetables", icon: "🥦" },
  { id: "8", name: "Bell Pepper", category: "Vegetables", icon: "🫑" },
  { id: "9", name: "Chicken Breast", category: "Meat & Seafood", icon: "🍗" },
  { id: "10", name: "Ground Beef", category: "Meat & Seafood", icon: "🥩" },
  { id: "11", name: "Salmon", category: "Meat & Seafood", icon: "🐟" },
  { id: "12", name: "Shrimp", category: "Meat & Seafood", icon: "🦐" },
  { id: "13", name: "Bacon", category: "Meat & Seafood", icon: "🥓" },
  { id: "14", name: "Egg", category: "Dairy & Eggs", icon: "🥚" },
  { id: "15", name: "Milk", category: "Dairy & Eggs", icon: "🥛" },
  { id: "16", name: "Cheese", category: "Dairy & Eggs", icon: "🧀" },
  { id: "17", name: "Butter", category: "Dairy & Eggs", icon: "🧈" },
  { id: "18", name: "Yogurt", category: "Dairy & Eggs", icon: "🍦" },
  { id: "19", name: "Flour", category: "Pantry/Condiments", icon: "🌾" },
  { id: "20", name: "Sugar", category: "Pantry/Condiments", icon: "🍬" },
  { id: "21", name: "Olive Oil", category: "Pantry/Condiments", icon: "🫒" },
  { id: "22", name: "Soy Sauce", category: "Pantry/Condiments", icon: "🍶" },
  { id: "23", name: "Honey", category: "Pantry/Condiments", icon: "🍯" },
];

const CATEGORIES: Category[] = ["Vegetables", "Meat & Seafood", "Dairy & Eggs", "Pantry/Condiments"];
const TAGS: Tag[] = ["Main Course", "Appetizer", "Snack", "Dessert"];

// --- Components ---

const FridgeGraphic = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <div className="relative w-64 h-96 mx-auto perspective-1000">
      <div className="absolute inset-0 bg-slate-100 border-4 border-slate-300 rounded-lg shadow-xl overflow-hidden">
        <div className="h-full w-full flex flex-col justify-around p-4 opacity-50">
          <div className="h-1 bg-slate-300 w-full rounded" />
          <div className="h-1 bg-slate-300 w-full rounded" />
          <div className="h-1 bg-slate-300 w-full rounded" />
        </div>
      </div>
      <motion.div 
        initial={false}
        animate={{ rotateY: isOpen ? -110 : 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="absolute inset-y-0 left-0 w-1/2 bg-slate-50 border-r border-slate-300 rounded-l-lg shadow-lg origin-left z-10"
      >
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-slate-400 rounded-full" />
      </motion.div>
      <motion.div 
        initial={false}
        animate={{ rotateY: isOpen ? 110 : 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="absolute inset-y-0 right-0 w-1/2 bg-slate-50 border-l border-slate-300 rounded-r-lg shadow-lg origin-right z-10"
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-slate-400 rounded-full" />
      </motion.div>
    </div>
  );
};

export default function App() {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeFilters, setActiveFilters] = useState<Tag[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingGuide, setCookingGuide] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  // Phase 1 Handlers
  const handleOpenFridge = () => {
    setFridgeOpen(true);
    setTimeout(() => setPhase(2), 1000);
  };

  // Phase 2 Handlers
  const toggleIngredient = (ingredient: Ingredient) => {
    setSelectedIngredients(prev => 
      prev.find(i => i.id === ingredient.id)
        ? prev.filter(i => i.id !== ingredient.id)
        : [...prev, ingredient]
    );
  };

  const handleGenerate = async () => {
    if (selectedIngredients.length === 0) return;
    setIsGenerating(true);
    
    try {
      const ingredientNames = selectedIngredients.map(i => i.name).join(", ");
      
      // Use Gemini to determine API parameters
      const prompt = `你是一个集成了 Spoonacular 数据库的智能菜谱助手。你的核心任务是将用户输入的原材料转化为标准的 API 查询参数。
食材：${ingredientNames}
请输出一个标准化的 JSON 块，用于前端调用 Spoonacular API。不要有任何多余文字：
{
"endpoint": "findByIngredients",
"params": {
"ingredients": "translated_ingredients_in_english",
"number": 6,
"ranking": 1,
"ignorePantry": true
}
}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const apiConfig = JSON.parse(result.text);
      const { ingredients, number, ranking, ignorePantry } = apiConfig.params;

      // Call Spoonacular API
      const response = await fetch(
        `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=${number}&ranking=${ranking}&ignorePantry=${ignorePantry}&apiKey=${SPOONACULAR_API_KEY}`
      );
      const data = await response.json();

      // Map Spoonacular data to our Recipe interface
      const mappedRecipes: Recipe[] = data.map((r: any) => ({
        id: r.id.toString(),
        title: r.title,
        tag: "Main Course", // Default tag, will refine with Gemini if needed
        matchPercentage: Math.round((r.usedIngredientCount / (r.usedIngredientCount + r.missedIngredientCount)) * 100),
        image: r.image,
        time: "20-40 min", // Placeholder
        ingredients: r.usedIngredients.map((i: any) => i.name),
        missedIngredients: r.missedIngredients.map((i: any) => i.name)
      }));

      setRecipes(mappedRecipes);
      setPhase(3);
    } catch (error) {
      console.error("Error generating recipes:", error);
      alert("Failed to generate recipes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Phase 3 Logic
  const filteredRecipes = useMemo(() => {
    let results = [...recipes].sort((a, b) => b.matchPercentage - a.matchPercentage);
    if (activeFilters.length > 0) {
      results = results.filter(r => activeFilters.includes(r.tag));
    }
    return results;
  }, [recipes, activeFilters]);

  const toggleFilter = (tag: Tag) => {
    setActiveFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const fetchCookingGuide = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCookingGuide(null);
    setIsLoadingGuide(true);

    try {
      const prompt = `你是一个集成了 Spoonacular 数据库的智能菜谱助手。
菜名：${recipe.title}
图片：${recipe.image}
已有食材：${recipe.ingredients.join(", ")}
缺失食材：${recipe.missedIngredients?.join(", ") || "无"}

请以 Markdown 格式展示图片，并详细用中文撰写烹饪步骤。
展示图片格式：![${recipe.title}](${recipe.image})
要求：
1. 语言：对用户的讲解和步骤说明必须使用中文。
2. 专业度：在步骤中加入适量的烹饪小贴士（如：火候控制、去腥技巧）。
3. 优先寻找匹配度最高（Missed Ingredient 最少）的菜谱指导。`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setCookingGuide(result.text);
    } catch (error) {
      console.error("Error fetching cooking guide:", error);
      setCookingGuide("Failed to get cooking guide, please try again later.");
    } finally {
      setIsLoadingGuide(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 font-sans selection:bg-emerald-200">
      <AnimatePresence mode="wait">
        {/* PHASE 1: LANDING */}
        {phase === 1 && (
          <motion.div 
            key="phase1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-emerald-800 mb-4 tracking-tight">
                What's in my Fridge?
              </h1>
              <p className="text-lg text-emerald-600 mb-12 max-w-md mx-auto">
                Smart Recipe Assistant: Transform your ingredients into delicious meals.
              </p>
            </motion.div>

            <FridgeGraphic isOpen={fridgeOpen} />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenFridge}
              className="mt-12 px-8 py-4 bg-emerald-600 text-white rounded-full font-semibold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              Open Fridge to Start <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}

        {/* PHASE 2: SELECTION */}
        {phase === 2 && (
          <motion.div 
            key="phase2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto p-4 md:p-8 pb-32"
          >
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-emerald-900 mb-2">Select Ingredients</h2>
              <p className="text-emerald-600">Select the ingredients you have, and we'll recommend recipes for you.</p>
            </header>

            {currentCategory ? (
              <div className="space-y-6">
                <button 
                  onClick={() => { setCurrentCategory(null); setSearchQuery(""); }}
                  className="flex items-center gap-2 text-emerald-700 font-medium hover:text-emerald-800 transition-colors mb-4"
                >
                  <ArrowLeft size={18} /> Back to Categories
                </button>

                <div className="sticky top-4 z-20 bg-emerald-50/80 backdrop-blur-md py-2">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
                    <input 
                      type="text"
                      placeholder={`Search in ${currentCategory}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:outline-none shadow-sm transition-all text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {INGREDIENTS
                    .filter(i => i.category === currentCategory && i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(ingredient => {
                      const isSelected = selectedIngredients.find(si => si.id === ingredient.id);
                      return (
                        <motion.button
                          key={ingredient.id}
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleIngredient(ingredient)}
                          className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                            isSelected 
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md" 
                              : "bg-white border-emerald-50 text-emerald-800 hover:border-emerald-200"
                          }`}
                        >
                          <span className="text-4xl mb-3">{ingredient.icon}</span>
                          <span className="font-medium text-sm text-center leading-tight">{ingredient.name}</span>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <CheckCircle2 size={16} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {CATEGORIES.map(cat => (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentCategory(cat)}
                    className="group relative h-48 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
                      <span className="text-5xl mb-4 opacity-80 group-hover:scale-110 transition-transform">
                        {cat === "Vegetables" && "🥦"}
                        {cat === "Meat & Seafood" && "🥩"}
                        {cat === "Dairy & Eggs" && "🥚"}
                        {cat === "Pantry/Condiments" && "🧂"}
                      </span>
                      <h3 className="text-2xl font-bold tracking-tight">{cat}</h3>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100 p-4 md:p-6 shadow-2xl z-40">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils size={16} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Current Inventory</span>
                    <span className="ml-auto text-xs font-medium text-emerald-500">{selectedIngredients.length} items selected</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {selectedIngredients.length === 0 ? (
                      <p className="text-slate-400 text-sm italic">No ingredients selected yet...</p>
                    ) : (
                      selectedIngredients.map(i => (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={i.id} 
                          className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-100 whitespace-nowrap"
                        >
                          <span>{i.icon}</span>
                          {i.name}
                          <button onClick={() => toggleIngredient(i)} className="hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
                
                <motion.button
                  disabled={selectedIngredients.length === 0 || isGenerating}
                  onClick={handleGenerate}
                  className={`w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                    selectedIngredients.length > 0 
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={22} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ChefHat size={22} />
                      Generate Recipes
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 3: RESULTS */}
        {phase === 3 && (
          <motion.div 
            key="phase3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto p-4 md:p-8"
          >
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <button 
                  onClick={() => setPhase(2)}
                  className="flex items-center gap-2 text-emerald-700 font-medium hover:text-emerald-800 transition-colors mb-4"
                >
                  <ArrowLeft size={18} /> Adjust Ingredients
                </button>
                <h2 className="text-4xl font-black text-emerald-900 tracking-tight">Your Smart Recipes</h2>
                <p className="text-emerald-600 mt-2">Based on your {selectedIngredients.length} selected ingredients.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter(tag)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      activeFilters.includes(tag)
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                        : "bg-white border-emerald-100 text-emerald-700 hover:border-emerald-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-emerald-50 flex flex-col"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={recipe.image} 
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-emerald-800 uppercase tracking-widest shadow-sm">
                        {recipe.tag}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-lg">
                        {recipe.matchPercentage}% Match
                      </div>
                    </div>

                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                        <Clock size={14} /> {recipe.time}
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-4 leading-tight group-hover:text-emerald-700 transition-colors">
                        {recipe.title}
                      </h3>
                      
                      <div className="mt-auto">
                        <div className="flex flex-wrap gap-2 mb-6">
                          {recipe.ingredients.map(ing => (
                            <span key={ing} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                              {ing}
                            </span>
                          ))}
                        </div>
                        <button 
                          onClick={() => fetchCookingGuide(recipe)}
                          className="w-full py-4 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <BookOpen size={18} /> View Cooking Guide
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search size={40} className="text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-900 mb-2">No recipes found</h3>
                  <p className="text-emerald-600">Try adjusting your filters or adding more ingredients.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cooking Guide Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Cooking Guide</h3>
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                {isLoadingGuide ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={40} />
                    <p className="text-emerald-700 font-medium">Preparing your cooking guide...</p>
                  </div>
                ) : (
                  <div className="prose prose-emerald max-w-none">
                    <div className="markdown-body">
                      <Markdown>{cookingGuide || ""}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .perspective-1000 { perspective: 1000px; }
        .markdown-body img { border-radius: 1.5rem; margin: 1.5rem 0; width: 100%; object-fit: cover; height: 300px; }
        .markdown-body h1, .markdown-body h2 { color: #065f46; margin-top: 2rem; }
        .markdown-body p { line-height: 1.7; color: #334155; }
        .markdown-body li { margin-bottom: 0.5rem; }
      `}} />
    </div>
  );
}
