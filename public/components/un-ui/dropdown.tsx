import { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import styles from './UnUI.module.css'

import { ArrowRight } from 'react-feather'

interface Props { callback: Function, defaultValue: any, parameter?: string, valueParameter?: string, options: any[] };
declare type NativeAttrs = Omit<React.InputHTMLAttributes<any>, keyof Props>;

const DropDown: React.FC<Props & NativeAttrs> = ({ options, defaultValue, parameter, valueParameter, callback, ...args }) => {
    const input_ref = useRef<HTMLSelectElement>(null);

    return (
        <select
            className={styles.input}
            onChange={() => {
                if(input_ref?.current) callback(input_ref.current.value)
            }}
            value={defaultValue}
            ref={input_ref}
            style={{ margin: 0, width: 'calc(100% - 10px)' }}
            {...args}
        >
        {
            options.map((e, i) => 
                <option key={`OPTION_${i}_`} value={valueParameter ? e?.[valueParameter] : parameter ? e?.[parameter] : e} style={{ color: 'black' }}>
                    {
                        maxLetters(parameter ?
                            e?.[parameter]
                        :
                            e
                        , 35)
                    }
                </option>
            )
        }
        </select>
    )
}

const maxLetters = (string: String, letters: number) => {
    let a = string.replaceAll("Microphone ", "").replaceAll("Speakers ", "").replaceAll(/\).*$/g, "").replaceAll("(", "");

    return a.length > letters ? a.substring(0, letters-3)+"..." : a;
}

export default DropDown;