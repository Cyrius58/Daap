import React, { Component, useState, useEffect } from "react";
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import Addresse from "./Addresse.js";

import "./App.css";


class App extends Component {
  state = { events:null, nbProposals:null, nbVoters:null, oneProposal:null, totalVotes:null, voter:null, winner:null, workflowStatus:null, owned:false, web3: null, accounts: null, contract: null };
  enumWorkflowStatus = ["RegisteringVoters","ProposalsRegistrationStarted","ProposalsRegistrationEnded","VotingSessionStarted","VotingSessionEnded","VotesTallied"];
  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(VotingContract.abi,deployedNetwork && deployedNetwork.address);

      /**
       * Liste des valeurs récupérées par les getters
       */
      let nbProposals = await instance.methods.getNbProposals().call();
      let nbVoters = await instance.methods.getNbVoters().call();
      /**Il faut instancier ces variables plus tard ! */
      //let oneProposal = await instance.methods.getOneProposal(1).call();
      //let totalVotes = await instance.methods.getTotalVotes().call();
      //let voter = await instance.methods.getVoter("0x").call();
      //let winner = await instance.methods.getWinner().call();
      const owner = await instance.methods.owner().call();
      let workflowStatus = await instance.methods.getWorkflowStatus().call();
      let owned= accounts[0]==owner;


      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      let options = {
        fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
        toBlock: 'latest'
      };
      const listEvents=await instance.getPastEvents('MaxVoters',options);

      this.setState({ events:listEvents, nbProposals, nbVoters, 
        //oneProposal, totalVotes, voter, winner, 
        workflowStatus, web3, accounts, owned, contract: instance });

      //const {contract} = this.state;
      //this.setState({ storageValue: await contract.methods.get().call(),});

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };


runDefineMaxVoters = async ()=>{

  const {accounts, contract}=this.state;
  let nbVotant=document.getElementById("nbVotant").value;
  await contract.methods.defineMaxVoters(nbVotant).send({from:accounts[0]});

  const listEvents=await contract.getPastEvents('MaxVoters');
  this.setState({event:listEvents});
};

runAddVoter = async ()=>{

    const {accounts, contract}=this.state;
    let address=document.getElementById("adressevotant").value;
    await contract.methods.addVoter(address).send({from:accounts[0]});

    let options = {
      fromBlock:'earliest',                  //Number || "earliest" || "pending" || "latest"
      toBlock: 'earliest'
    };
    const getEvent=await contract.getPastEvents('VoterRegistered',options);
    this.setState({event:getEvent});
};




  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    if(this.state.owned){
      return (
        <div className="App">
          <h1>Tu es l'admin du système de vote !</h1><h2>Ton addresse metamask : </h2>
          <Addresse addr={this.state.accounts}/> {/*permet d'afficher l'adresse du compte utilisé*/}

          <h1>Bienvenue sur le système de vote.</h1>
          <p>Nombre de propositions actuel : {this.state.nbProposals}</p>
          <p>Nombre de votants actuel : {this.state.nbVoters}</p>
          <p>Statut actuel de la session de vote : {this.enumWorkflowStatus[this.state.workflowStatus]}</p>

          <div>
            <form>
              <label for="nbVotant">Définir le nombre de votant : </label>
              <input type="text" id="nbVotant" min="2" max="10" placeholder="Nb de votant"/><br />
              <input type="button" onClick={this.runDefineMaxVoters}value="Ajouter"/>
            </form>
            <form>
              <label for="address">Ajouter un votant : </label>
              <input type="text" id="adressevotant" required minLength="42" placeholder="adresse 0x du votant"/><br />
              <input type="button" onClick={this.runAddVoter}value="Ajouter"/>
            </form>

              {this.state.events.map((addresse)=>(<div>{addresse.returnValues.MaxVoters}</div>))}

            
            {console.log("Console : ")+console.log(this.state.events)}
            
          </div>

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        </div>
      );
    }else{
      return(
      <div className="App">
        <p>Bonjour</p>
        <p>Statut actuel de la session de vote : {this.enumWorkflowStatus[this.state.workflowStatus]}</p>


      </div>);}
  }
}




















export default App;
