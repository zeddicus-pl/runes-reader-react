import { ReactNode, useEffect, useRef, useState } from 'react';
import { read, getConstantData, setConstantData, types } from '@dschu012/d2s';
import { read as stashRead } from '@dschu012/d2s/lib/d2/stash';
import { constants as constants96 } from '@dschu012/d2s/lib/data/versions/96_constant_data';
import { constants as constants99 } from '@dschu012/d2s/lib/data/versions/99_constant_data';

interface RunesSummary {
  runes: ({[runeName: string]: number}),
  readFiles: string[], // array or savefile names read from filesystem
  readErrors: string[], // array or savefile names that were not read due to error
}

interface Props {
  element: ReactNode, //element to render as a button. This will be covered by invisible file upload button.
  onSubmit: (result: RunesSummary) => void, // callback to call with results
}

export const runesMap: Record<string, string> = {
  "r01": "el",
  "r02": "eld",
  "r03": "tir",
  "r04": "nef",
  "r05": "eth",
  "r06": "ith",
  "r07": "tal",
  "r08": "ral",
  "r09": "ort",
  "r10": "thul",
  "r11": "amn",
  "r12": "sol",
  "r13": "shael",
  "r14": "dol",
  "r15": "hel",
  "r16": "io",
  "r17": "lum",
  "r18": "ko",
  "r19": "fal",
  "r20": "lem",
  "r21": "pul",
  "r22": "um",
  "r23": "mal",
  "r24": "ist",
  "r25": "gul",
  "r26": "vex",
  "r27": "ohm",
  "r28": "lo",
  "r29": "sur",
  "r30": "ber",
  "r31": "jah",
  "r32": "cham",
  "r33": "zod",
}

const getRunesFromSave = async (file: File, data: Uint8Array): Promise<{[runeName: string]: number}> => {
  const runes: {[runeName: string]: number} = {};
  const isRune = (item: types.IItem): boolean => !!item.type && !!item.type.match(/^r[0-3][0-9]$/);

  const parseItems = (itemList: types.IItem[]) => {
    itemList.forEach((item) => {
      if (isRune(item) && runesMap[item.type]) {
        const runeName = runesMap[item.type];
        if (typeof runes[runeName] === 'undefined') {
          runes[runeName] = 1;
        } else {
          runes[runeName] += 1;
        }
      }
    });
  }

  const parseD2S = (response: types.ID2S) => {
    const items = response.items || [];
    const mercItems = response.merc_items || [];
    const corpseItems = response.corpse_items || [];
    const itemList = [
      ...items,
      ...mercItems,
      ...corpseItems,
    ]
    parseItems(itemList);
  };

  const parseStash = (response: types.IStash) => {
    response.pages.forEach(page => {
      parseItems(page.items);
    });
  }

  switch (file.name.toLowerCase().split('.').reverse()[0]) {
    case 'sss':
    case 'd2x':
      await stashRead(data).then((response) => {
        parseStash(response);
      });
      break;
    case 'd2i':
      await stashRead(data).then(parseStash);
      break;
    case 'd2s':
      await read(data).then(parseD2S);
      break;
    default:
      throw new Error("wrongType")
  }
  return runes;
};

const parseSave = async (file: File): Promise<RunesSummary> => new Promise((resolve, reject) => {
  let fr = new FileReader();
  fr.onload = async function(){
    const data: ArrayBuffer = fr.result as ArrayBuffer;
    try {
      resolve({
        runes: await getRunesFromSave(file, new Uint8Array(data)),
        readFiles: [ file.name ],
        readErrors: [],
      });
    } catch (e: any) {
      if (e.message === "wrongType") {
        // silently ignore files of incorrect extension
        resolve({
          runes: {},
          readFiles: [],
          readErrors: [],
        });
      } else {
        console.log(e);
        resolve({
          runes: {},
          readFiles: [],
          readErrors: [ file.name ],
        });
      }
    }
  };
  fr.onerror = function(e){
    console.log(e);
    resolve({
      runes: {},
      readFiles: [],
      readErrors: [ file.name ],
    });
  };
  fr.readAsArrayBuffer(file);
});

const SaveReader = (props: Props) => {
  const {element, onSubmit} = props;

  useEffect(() => {
    try { getConstantData(96); } catch (e) { setConstantData(96, constants96); }
    try { getConstantData(97); } catch (e) { setConstantData(97, constants96); }
    try { getConstantData(98); } catch (e) { setConstantData(98, constants96); }
    try { getConstantData(99); } catch (e) { setConstantData(99, constants99); }
  }, []);

  const [uploadFieldReset, setUploadFieldReset] = useState<number>(0);

  return (
    <div
      className="saveReaderContainer"
      style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }}
    >
      <input
        type="file"
        id="saveReaderFiles"
        key={uploadFieldReset}
        multiple
        style={{ position: 'absolute', top: 0, left: 0, border: 0, padding: 0, margin: 0, outline: 0, bottom: 0, right: 0, opacity: 0, display: 'block' }}
        onChange={(e) => {
          if (!e.currentTarget.files || !e.currentTarget.files.length) {
            return;
          }
          // reset upload field
          setUploadFieldReset(uploadFieldReset + 1);
          // parse all save files
          const files = Array.from(e.currentTarget.files);
          Promise.all(files.map(parseSave))
            .then((promiseResults) => {
              // smash together results from all files and run callback
              onSubmit(promiseResults.reduce(
                (results, result) => ({
                  runes: Object.keys(result.runes).reduce((runes: {[runeName: string]: number}, runeName) => {
                    runes[runeName] = (typeof results.runes[runeName] === 'undefined' ? 0 : results.runes[runeName]) + result.runes[runeName];
                    return runes;
                  }, results.runes),
                  readErrors: [ ...results.readErrors, ...result.readErrors ],
                  readFiles: [ ...results.readFiles, ...result.readFiles ],
                }), {
                  runes: {},
                  readErrors: [],
                  readFiles: [],
                }
              ));
            });
        }}
      />
      {element}
    </div>
  );
}

export default SaveReader;
