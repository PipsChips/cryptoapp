import React, { Component } from 'react';
import { Chart } from 'react-google-charts';
import PropTypes from 'prop-types';
import './App.css';
// import { CandleStickChart  } from 'react-d3';
import moment from 'moment';
// import {ma} from 'moving-averages';
var sma = require('sma');

class App extends Component {
  constructor() {
    super();

    this.state = {
      currencies: null,
      timestamp: null,
      selectedSymbol: "",
      startDate: "",
      endDate: "",
      closingPrices: [],
      openingPrices: [],
      highPrices: [],
      lowPrices: [],
      smaRange: 2,
      smaPrices: [],
      dates: [],
      points: [],
      candlestickData: [],
      smaLineData: [
        ['DAY', 'val1'],
        ['2017-12-17', 12500],
        ['2017-12-19', 14500],
        ['2017-12-21', 12500]
      ]
    };

    this.symbolChange = this.symbolChange.bind(this);
    this.calculate = this.calculate.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.smaRangeChanged = this.smaRangeChanged.bind(this);
  }

  componentWillMount(){
    fetch('https://min-api.cryptocompare.com/data/all/coinlist')
    .then(response => response.json())
    .then(json => {
      var defaultWatchlistNames = [];
      var defaultWatchlistIds = json.DefaultWatchlist.CoinIs.split(",");

      for(var currency in json.Data) {
        if (defaultWatchlistIds.includes(json.Data[currency].Id)) {
          defaultWatchlistNames.push(currency);
        }
      } 

      this.setState({currencies: defaultWatchlistNames});
      this.setState({selectedSymbol: defaultWatchlistNames[0]});
    });
  }

  symbolChange(e) {
    this.setState({selectedSymbol: e.target.value});
    console.log("symbol changed to " + e.target.value);
  }

  calculate(e) {
    e.preventDefault();

    var symbol = this.state.selectedSymbol;
    var startDate = moment(this.state.startDate,'YYYY/MM/DD');
    var endDate = moment(this.state.endDate,'YYYY/MM/DD');
    var diffDays = endDate.diff(startDate, 'days');
    var timestamp = parseInt(moment(endDate).format("X")) + 86400;
    var endPointUrl = `https://min-api.cryptocompare.com/data/histoday?fsym=${symbol}&tsym=EUR&limit=${diffDays - 1}&aggregate=1&toTs=${timestamp}`;
    console.log(endPointUrl);

    fetch(endPointUrl).then(res => res.json())
      .then(json => {
        this.setState({closingPrices: json.Data.map(day => day.close)});
        this.setState({openingPrices: json.Data.map(day => day.open)});
        this.setState({highPrices: json.Data.map(day => day.high)});
        this.setState({lowPrices: json.Data.map(day => day.low)});
        
        this.setState( {dates: json.Data.map(day => moment.unix(day.time).format("YYYY/MM/DD"))});
      })
      .then(() => {
        var newPoints = [];
        for(var i = 0; i < this.state.closingPrices.length; i++) {
          newPoints.push({x: this.state.dates[i], y: this.state.closingPrices[i]});
        }
        this.setState({points: newPoints});
        this.setState({smaPrices: sma(this.state.closingPrices, this.state.smaRange, (n) => n.toFixed(2))});
      })
      .then(() => {
        

        var newData = [["DAY","val1","val2","val3","val4"]];
        for (var i = 0; i < this.state.dates.length; i++) {
          if(this.state.closingPrices[i] > this.state.openingPrices[i]) {
            newData.push([this.state.dates[i], this.state.lowPrices[i], this.state.openingPrices[i], this.state.closingPrices[i], this.state.highPrices[i]]);
          }
          else {
            newData.push([this.state.dates[i], this.state.highPrices[i], this.state.openingPrices[i], this.state.closingPrices[i], this.state.lowPrices[i]]);
          }
        }
        this.setState({candlestickData: newData});
      })
      .then(() => {
        console.log("CLOSING PRICES", this.state.closingPrices);
        console.log("OPENING PRICES", this.state.openingPrices);
        console.log("LOW PRICES", this.state.lowPrices);
        console.log("HIGH PRICES", this.state.highPrices);
        console.log("SMA PRICES", this.state.smaPrices);
        console.log("DATES",this.state.dates);
        console.log("POINTS: ", this.state.points);
        console.log("CANDLESTICK DATA: ", this.state.candlestickData);
      });
  }

  dateChanged(date, e) {
    date === 'startDate' ? 
      this.setState({startDate: e.target.value}, () => console.log(this.state.startDate)) : 
      this.setState({endDate: e.target.value}, () => console.log(this.state.endDate));

    this.setState({closingPrices: []});
    this.setState({smaPrices: []});    
  }

  smaRangeChanged(e) {
    this.setState({smaRange: parseInt(e.target.value)});
    this.setState({smaPrices: []});    
  }

  render() {
    var props1 = {
      chartType:"CandlestickChart",
      data: this.state.candlestickData,
      width:"100%",
      options:{
        title:"Candlestick Chart",
        legend:"none"
      }
    };

    var props2 = {
      chartType:"LineChart",
      data: this.state.smaLineData,
      width:"100%",
      options:{
        title:"Candlestick Chart",
        legend:"none"
      }
    };

    var comboProps = {
      chartType:"ComboChart",
      data: [
        ['Date', 'Low', 'Open', 'Close', 'High', 'SMA'],
        ['2014/05',   200,   324,    500,    456,     350],
        ['2014/06',   322,   123,    543,    234,     320],
        ['2014/07',   432,   455,    467,    568,     415],
      ],
      width:"100%",
      options:{
        title:"Combo Chart",
        seriesType: "candlesticks",
        series: {
          1: {
            type: "line"
          }
        },
        legend:"none"
      }
    };

    return (
      <div className="App">
        <form onSubmit={this.calculate}>
          <select value={this.state.selectedSymbol} onChange={this.symbolChange}>
            {this.state.currencies && this.state.currencies.map(curr => 
                <option value={curr} key={curr}>{curr}</option>) 
            }
          </select>
          <br />
          <input type="date" onChange={this.dateChanged.bind(this, 'startDate')} />
          <br />
          <input type="date" onChange={this.dateChanged.bind(this, 'endDate')} />
          <br />
          <label htmlFor="smaRange">SMA(<i>Range</i>)</label>
          <input id="smaRange" type="number" value={this.state.smaRange} min="1" onChange={this.smaRangeChanged} />
          <br />
          <input type="submit" value="Calculate" />
        </form>
        {(this.state.closingPrices.length > 0) && <h3>Closing Prices:</h3>}
        <ol>
          {this.state.closingPrices.map(price => <li key={price.toFixed(2)}>{price.toFixed(2)}</li>)}
        </ol>
        {(this.state.smaPrices.length > 0) && <h3>SMA({this.state.smaRange}):</h3>}
        <ol start={this.state.smaRange}>
          {this.state.smaPrices.map(sma => <li key={parseFloat(sma).toFixed(2)}>{parseFloat(sma).toFixed(2)}</li>)}
        </ol>        
        {/* {(this.state.candlestickData.length > 0) && <Chart  {...props2} {...props1}/>} */}
        <Chart  {...comboProps} />
      </div>
    );
  }
}

export default App;
