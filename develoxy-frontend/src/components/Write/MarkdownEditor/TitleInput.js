import React, { Component } from 'react';
import { Button, Dropdown } from 'semantic-ui-react';
import debounce from 'lodash/debounce';
import Buttons from './Buttons';

class TitleInput extends Component {

    constructor(props) {
        super(props);
        // this.handleChange = debounce(this.handleChange, 500);
        this.delayedChange = debounce(this.delayedChange, 100);
    }

    handleChange = (e) => {
        e.persist();
        this.delayedChange(e);
    }

    delayedChange = (e) => {
        const { onChange } = this.props;
        onChange(e.target.value);
    }
    
    render() {
        const { handleChange } = this;
        const { onSave, isTemp } = this.props;

        return (
            <div className="title-input">
                <Buttons onSave={onSave} isTemp={isTemp}/>
                <div className="input-wrapper">
                    <input type="text" placeholder="포스트 제목" onChange={handleChange}></input>
                </div>
            </div>
        );
    }
}

export default TitleInput;