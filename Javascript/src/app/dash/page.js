'use client'
import {useState,useEffect } from 'react';
import Link from 'next/link'
import OuterChat from '../components/OuterChat';


export default function Page() {

    const [value, setValue] = useState("Ai-Con-V2");
    const [inputVal, setInputVal] = useState("")
    const [sendVal,setSendVal]  = useState("")
    const [windowSize, setWindowSize] = useState(0);

    useEffect(() => {
      const handleResize = () => {
        setWindowSize(window.innerWidth);
      };

      if (typeof window !== 'undefined') {
        setWindowSize(window.innerWidth);
        window.addEventListener('resize', handleResize);
      }
  

      if(windowSize <= 500 && value === "Compare"){
        setValue("Ai-Con-V2")
          setInputVal("")
          setSendVal("")
      }
  
      // Clean up the event listener on component unmount
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('resize', handleResize);
        }
      };
    }, [windowSize,value]);

    const handleChange = (e) => {
      setValue(e.target.value);
      if(e.target.value === "Compare"){
        setInputVal("")
        setSendVal("")
      }
    };

    const inputChange = (e) => {
      setInputVal(e.target.value)
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      setSendVal(inputVal)
      setInputVal("")
    };
    return (
      <div className = "" >
        <div className = " flex justify-between  h-[6vh] px-3  py-[0.5] shadow-md ">
          <div className = "flex justify-center items-center">
            <Link href = "/">
            <img className = "" src = "back-home.svg" width={40} height={15} alt = "people"></img>
            </Link>
          </div>

          <div className = "h-[100%] flex justify-center items-center">
            <div className = "mr-2">Model</div>
            <select value={value} onChange={handleChange} className = "font-semibold bg-[#ECEBEB] rounded-md border border-black">
              <option value="Ai-Con-V2">Ai-Con-V2</option>
              <option value="Open Assistant">Ai-Con-V3</option>
              
            </select>
          </div>
        </div>
        {value === "Ai-Con-V2" ?
          <OuterChat model={"v2"} full = {"true"}/> :
          <OuterChat model={"v3"} full = {"true"}/>
        }
      </div>
    )
}