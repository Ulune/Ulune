/** The device's own Chinese font (languages plan: nothing downloaded). */
export const CJK = '"PingFang TC", "PingFang SC", "Noto Sans CJK TC", "Noto Sans CJK SC", "Microsoft JhengHei", "Microsoft YaHei", sans-serif';

export function hanziLang(script: "hant" | "hans") {
  return script === "hans" ? "zh-Hans" : "zh-Hant";
}

/** The animals' own characters (the branch's is on the rim): 鼠 for the Rat, 馬 or 马 for the Horse. */
const ANIMAL_HANT = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"];
const ANIMAL_HANS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
export const animalChar = (i: number, script: "hant" | "hans") => (script === "hans" ? ANIMAL_HANS : ANIMAL_HANT)[i]!;
