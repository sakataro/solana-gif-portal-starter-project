import githubLogo from "./assets/GitHub-Mark-Light-32px.png";
import "./App.css";
import { useEffect, useState } from "react";
import idl from "./idl.json";
import kp from "./keypair.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
require("dotenv").config();

// 定数を宣言します。
const GITHUB_HANDLE = "sakataro";
const GITHUB_LINK = `https://github.com/${GITHUB_HANDLE}`;

const { SystemProgram, Keypair } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl(process.env.SOLANA_NETWORK);
const opts = {
  preflightCommitment: "processed",
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifLists, setGifLists] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana && solana.isPhantom) {
        console.log("phantom wallet found");
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          "connected with public key: ",
          response.publicKey.toString()
        );
        setWalletAddress(response.publicKey.toString());
      } else {
        alert("Solana object is not found. Get a Phantom Wallet");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (!solana) {
      alert("Solana object is not found. Get a Phantom Wallet");
      return;
    }
    const response = await solana.connect();
    console.log("connected with public key: ", response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("empty input. try again");
      return;
    }
    setInputValue("");
    console.log("gif link: ", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getGifList();
    } catch (e) {
      console.error(e);
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (gifLists === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            value={inputValue}
            placeholder="Enter gif link!"
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
          {gifLists.map((gif, index) => (
            <div className="gif-item" key={index}>
              <img src={gif.gifLink} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);

    return () => window.removeEventListener("load", onLoad);
  }, []);

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("got the account", account);
      setGifLists(account.gifList);
    } catch (error) {
      console.error("error in getGifList", error);
      setGifLists(null);
    }
  };
  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    console.log("fetching gif list ...");

    // fetch gif images from solana
    getGifList();
  }, [walletAddress]);

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "created a new BaseAccount w/ address: ",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 cat GIF Portal</p>
          <p className="sub-text">View your cat GIF collection ✨</p>
          {!walletAddress && renderNotConnectedContainer()}
        </div>
        <main className="main">
          {walletAddress && renderConnectedContainer()}
        </main>
        <div className="footer-container">
          <img alt="Github Logo" className="github-logo" src={githubLogo} />
          <a
            className="footer-text"
            href={GITHUB_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${GITHUB_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
