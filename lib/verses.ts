/*
 * Слово на каждый день.
 *
 * Стих меняется раз в сутки и одинаков у всех пользователей в этот день.
 * RU — Синодальный перевод, DE — Lutherbibel 1912 (оба в общественном достоянии).
 *
 * Чтобы добавить стих — допиши объект в конец списка. Порядок не важен.
 */

export type Verse = {
  ref: { ru: string; de: string };
  ru: string;
  de: string;
};

export const VERSES: Verse[] = [
  {
    ref: { ru: "Иисус Навин 1:9", de: "Josua 1,9" },
    ru: "Будь тверд и мужествен, не бойся и не ужасайся; ибо с тобою Господь, Бог твой, везде, куда ни пойдешь.",
    de: "Siehe, ich habe dir geboten, dass du getrost und freudig seiest. Lass dir nicht grauen und entsetze dich nicht; denn der HERR, dein Gott, ist mit dir in allem, was du tun wirst.",
  },
  {
    ref: { ru: "Филиппийцам 4:13", de: "Philipper 4,13" },
    ru: "Всё могу в укрепляющем меня Иисусе Христе.",
    de: "Ich vermag alles durch den, der mich mächtig macht, Christus.",
  },
  {
    ref: { ru: "Исаия 41:10", de: "Jesaja 41,10" },
    ru: "Не бойся, ибо Я с тобою; не смущайся, ибо Я Бог твой; Я укреплю тебя, и помогу тебе, и поддержу тебя десницею правды Моей.",
    de: "Fürchte dich nicht, ich bin mit dir; weiche nicht, denn ich bin dein Gott! Ich stärke dich, ich helfe dir auch, ich halte dich durch die rechte Hand meiner Gerechtigkeit.",
  },
  {
    ref: { ru: "Псалом 22:1", de: "Psalm 23,1" },
    ru: "Господь — Пастырь мой; я ни в чем не буду нуждаться.",
    de: "Der HERR ist mein Hirte, mir wird nichts mangeln.",
  },
  {
    ref: { ru: "Галатам 6:9", de: "Galater 6,9" },
    ru: "Делая добро, да не унываем, ибо в свое время пожнем, если не ослабеем.",
    de: "Lasset uns aber Gutes tun und nicht müde werden; denn zu seiner Zeit werden wir auch ernten ohne Aufhören.",
  },
  {
    ref: { ru: "1 Коринфянам 15:58", de: "1. Korinther 15,58" },
    ru: "Итак, братия мои возлюбленные, будьте тверды, непоколебимы, всегда преуспевайте в деле Господнем, зная, что труд ваш не тщетен пред Господом.",
    de: "Darum, meine lieben Brüder, seid fest, unbeweglich und nehmet immer zu in dem Werk des HERRN, sintemal ihr wisset, dass eure Arbeit nicht vergeblich ist in dem HERRN.",
  },
  {
    ref: { ru: "Матфея 11:28", de: "Matthäus 11,28" },
    ru: "Придите ко Мне, все труждающиеся и обремененные, и Я успокою вас.",
    de: "Kommet her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.",
  },
  {
    ref: { ru: "Притчи 3:5-6", de: "Sprüche 3,5-6" },
    ru: "Надейся на Господа всем сердцем твоим, и не полагайся на разум твой; во всех путях твоих познавай Его, и Он направит стези твои.",
    de: "Verlass dich auf den HERRN von ganzem Herzen, und verlass dich nicht auf deinen Verstand; sondern gedenke an ihn in allen deinen Wegen, so wird er dich recht führen.",
  },
  {
    ref: { ru: "Римлянам 8:28", de: "Römer 8,28" },
    ru: "Притом знаем, что любящим Бога, призванным по Его изволению, все содействует ко благу.",
    de: "Wir wissen aber, dass denen, die Gott lieben, alle Dinge zum Besten dienen, denen, die nach dem Vorsatz berufen sind.",
  },
  {
    ref: { ru: "Иеремия 29:11", de: "Jeremia 29,11" },
    ru: "Ибо только Я знаю предначертания, какие Я имею о вас, говорит Господь, предначертания во благо, а не на зло, чтобы дать вам будущность и надежду.",
    de: "Denn ich weiß wohl, was ich für Gedanken über euch habe, spricht der HERR: Gedanken des Friedens und nicht des Leides, dass ich euch gebe das Ende, des ihr wartet.",
  },
  {
    ref: { ru: "Иоанна 16:33", de: "Johannes 16,33" },
    ru: "В мире будете иметь скорбь; но мужайтесь: Я победил мир.",
    de: "In der Welt habt ihr Angst; aber seid getrost, ich habe die Welt überwunden.",
  },
  {
    ref: { ru: "2 Тимофею 1:7", de: "2. Timotheus 1,7" },
    ru: "Ибо дал нам Бог духа не боязни, но силы и любви и целомудрия.",
    de: "Denn Gott hat uns nicht gegeben den Geist der Furcht, sondern der Kraft und der Liebe und der Besonnenheit.",
  },
  {
    ref: { ru: "Псалом 120:1-2", de: "Psalm 121,1-2" },
    ru: "Поднимаю глаза мои к горам, откуда придет помощь моя. Помощь моя от Господа, сотворившего небо и землю.",
    de: "Ich hebe meine Augen auf zu den Bergen, von welchen mir Hilfe kommt. Meine Hilfe kommt von dem HERRN, der Himmel und Erde gemacht hat.",
  },
  {
    ref: { ru: "Матфея 5:16", de: "Matthäus 5,16" },
    ru: "Так да светит свет ваш пред людьми, чтобы они видели ваши добрые дела и прославляли Отца вашего Небесного.",
    de: "So lasst euer Licht leuchten vor den Leuten, dass sie eure guten Werke sehen und euren Vater im Himmel preisen.",
  },
  {
    ref: { ru: "Колоссянам 3:23", de: "Kolosser 3,23" },
    ru: "И все, что делаете, делайте от души, как для Господа, а не для человеков.",
    de: "Alles, was ihr tut, das tut von Herzen als dem HERRN und nicht den Menschen.",
  },
  {
    ref: { ru: "Исаия 40:31", de: "Jesaja 40,31" },
    ru: "А надеющиеся на Господа обновятся в силе: поднимут крылья, как орлы, потекут — и не устанут, пойдут — и не утомятся.",
    de: "Aber die auf den HERRN harren, kriegen neue Kraft, dass sie auffahren mit Flügeln wie Adler, dass sie laufen und nicht matt werden, dass sie wandeln und nicht müde werden.",
  },
  {
    ref: { ru: "Псалом 118:105", de: "Psalm 119,105" },
    ru: "Слово Твое — светильник ноге моей и свет стезе моей.",
    de: "Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege.",
  },
  {
    ref: { ru: "Иоанна 15:5", de: "Johannes 15,5" },
    ru: "Я есмь лоза, а вы ветви; кто пребывает во Мне, и Я в нем, тот приносит много плода; ибо без Меня не можете делать ничего.",
    de: "Ich bin der Weinstock, ihr seid die Reben. Wer in mir bleibt und ich in ihm, der bringt viel Frucht; denn ohne mich könnt ihr nichts tun.",
  },
  {
    ref: { ru: "Матфея 28:20", de: "Matthäus 28,20" },
    ru: "И се, Я с вами во все дни до скончания века. Аминь.",
    de: "Und siehe, ich bin bei euch alle Tage bis an der Welt Ende.",
  },
  {
    ref: { ru: "Римлянам 12:12", de: "Römer 12,12" },
    ru: "Утешайтесь надеждою; в скорби будьте терпеливы, в молитве постоянны.",
    de: "Seid fröhlich in Hoffnung, geduldig in Trübsal, haltet an am Gebet.",
  },
  {
    ref: { ru: "1 Петра 5:7", de: "1. Petrus 5,7" },
    ru: "Все заботы ваши возложите на Него, ибо Он печется о вас.",
    de: "Alle eure Sorge werft auf ihn; denn er sorgt für euch.",
  },
  {
    ref: { ru: "Псалом 36:5", de: "Psalm 37,5" },
    ru: "Предай Господу путь твой и уповай на Него, и Он совершит.",
    de: "Befiehl dem HERRN deine Wege und hoffe auf ihn; er wird's wohl machen.",
  },
  {
    ref: { ru: "Второзаконие 31:6", de: "5. Mose 31,6" },
    ru: "Будьте тверды и мужественны, не бойтесь и не страшитесь их; ибо Господь, Бог твой, Сам идет с тобою и не оставит тебя и не покинет тебя.",
    de: "Seid getrost und unverzagt, fürchtet euch nicht und lasst euch nicht vor ihnen grauen; denn der HERR, dein Gott, wird selber mit dir wandeln und wird die Hand nicht abtun und dich nicht verlassen.",
  },
  {
    ref: { ru: "1 Тимофею 4:12", de: "1. Timotheus 4,12" },
    ru: "Никто да не пренебрегает юностью твоею; но будь образцом для верных в слове, в житии, в любви, в духе, в вере, в чистоте.",
    de: "Niemand verachte deine Jugend; sondern sei ein Vorbild den Gläubigen im Wort, im Wandel, in der Liebe, im Geist, im Glauben, in der Keuschheit.",
  },
  {
    ref: { ru: "Евреям 6:10", de: "Hebräer 6,10" },
    ru: "Ибо Бог не так несправедлив, чтобы забыл дело ваше и труд любви, который вы оказали во имя Его, послужив святым и служа им.",
    de: "Denn Gott ist nicht ungerecht, dass er vergäße eures Werkes und der Arbeit der Liebe, die ihr erzeigt habt an seinem Namen, da ihr den Heiligen dientet und noch dient.",
  },
  {
    ref: { ru: "Псалом 26:1", de: "Psalm 27,1" },
    ru: "Господь — свет мой и спасение мое: кого мне бояться? Господь — крепость жизни моей: кого мне страшиться?",
    de: "Der HERR ist mein Licht und mein Heil; vor wem sollte ich mich fürchten? Der HERR ist meines Lebens Kraft; vor wem sollte mir grauen?",
  },
  {
    ref: { ru: "Филиппийцам 4:4", de: "Philipper 4,4" },
    ru: "Радуйтесь всегда в Господе; и еще скажу: радуйтесь.",
    de: "Freuet euch in dem Herrn allewege, und abermals sage ich: Freuet euch!",
  },
  {
    ref: { ru: "Иоанна 14:27", de: "Johannes 14,27" },
    ru: "Мир оставляю вам, мир Мой даю вам; не так, как мир дает, Я даю вам. Да не смущается сердце ваше и да не устрашается.",
    de: "Den Frieden lasse ich euch, meinen Frieden gebe ich euch. Nicht gebe ich euch, wie die Welt gibt. Euer Herz erschrecke nicht und fürchte sich nicht.",
  },
  {
    ref: { ru: "Плач Иеремии 3:22-23", de: "Klagelieder 3,22-23" },
    ru: "По милости Господа мы не истреблены, ибо милосердие Его не истощилось. Оно обновляется каждое утро; велика верность Твоя!",
    de: "Die Güte des HERRN ist's, dass wir nicht gar aus sind; seine Barmherzigkeit hat noch kein Ende, sondern sie ist alle Morgen neu, und deine Treue ist groß.",
  },
  {
    ref: { ru: "Римлянам 15:13", de: "Römer 15,13" },
    ru: "Бог же надежды да исполнит вас всякой радости и мира в вере, дабы вы, силою Духа Святого, преисполнились надеждою.",
    de: "Der Gott der Hoffnung aber erfülle euch mit aller Freude und Frieden im Glauben, dass ihr völlige Hoffnung habt durch die Kraft des heiligen Geistes.",
  },
  {
    ref: { ru: "Матфея 19:14", de: "Matthäus 19,14" },
    ru: "Иисус же сказал: пустите детей и не препятствуйте им приходить ко Мне, ибо таковых есть Царство Небесное.",
    de: "Aber Jesus sprach: Lasset die Kindlein und wehret ihnen nicht, zu mir zu kommen; denn solcher ist das Himmelreich.",
  },
  {
    ref: { ru: "1 Коринфянам 16:13-14", de: "1. Korinther 16,13-14" },
    ru: "Бодрствуйте, стойте в вере, будьте мужественны, тверды. Все у вас да будет с любовью.",
    de: "Wachet, stehet im Glauben, seid männlich und seid stark! Alle eure Dinge lasst in der Liebe geschehen!",
  },
];

/** Стих дня: меняется в полночь по местному времени, у всех одинаков */
export function getVerseOfTheDay(date: Date = new Date()): Verse {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );

  return VERSES[dayNumber % VERSES.length];
}